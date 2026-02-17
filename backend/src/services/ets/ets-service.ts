import type { PrismaClient } from '../../../generated/prisma/index.js';
import {
  classifyEtsScope,
  calculateEtsObligation,
  aggregateEtsObligation,
  getSurrenderDeadline,
  forecastFullYearEtsCost,
  ETS_PHASE_IN,
} from './ets-calculator.js';
import { carbonPriceService } from './carbon-price.service.js';
import { logger } from '../../utils/logger.js';

class EtsService {
  /**
   * Aggregate all completed voyages for a vessel/year,
   * classify ETS scopes, and upsert an EtsRecord.
   * Requires an EtsAccount to exist for the organization.
   */
  async calculateAndPersist(
    vesselId: string,
    year: number,
    prisma: PrismaClient,
  ): Promise<void> {
    const vessel = await prisma.vessel.findUniqueOrThrow({
      where: { id: vesselId },
      include: { organization: { include: { etsAccounts: { take: 1 } } } },
    });

    const account = vessel.organization.etsAccounts[0];
    if (!account) {
      logger.warn({ vesselId, year }, 'No ETS account found for organization — skipping');
      return;
    }

    const yearStart = new Date(`${year}-01-01T00:00:00Z`);
    const yearEnd   = new Date(`${year}-12-31T23:59:59Z`);

    const voyages = await prisma.voyage.findMany({
      where: {
        vesselId,
        status: { in: ['completed', 'verified'] },
        departureAt: { gte: yearStart, lte: yearEnd },
      },
    });

    const euaPrice = await carbonPriceService.getLatestEuaPrice(prisma);

    let totalCo2Mt = 0;
    let totalApplicableMt = 0;
    let totalObligationMt = 0;
    let totalEstimatedCostEur = 0;

    for (const voyage of voyages) {
      // Reclassify scope from country codes (override stored scope for accuracy)
      const scope = classifyEtsScope(
        voyage.departurePortCountry,
        voyage.arrivalPortCountry,
      );

      const result = calculateEtsObligation(
        { co2Mt: voyage.co2EmissionsMt, scope, year },
        euaPrice,
      );

      totalCo2Mt              += voyage.co2EmissionsMt;
      totalApplicableMt       += result.co2ApplicableMt;
      totalObligationMt       += result.obligationMt;
      totalEstimatedCostEur   += result.estimatedCostEur;

      // Update voyage with classified scope + applicable CO2
      await prisma.voyage.update({
        where: { id: voyage.id },
        data: {
          etsScope: scope,
          etsCo2Applicable: result.co2ApplicableMt,
        },
      });
    }

    const phaseInPct = ETS_PHASE_IN[year] ?? 1.00;
    const surrenderDeadline = getSurrenderDeadline(year);

    await prisma.etsRecord.upsert({
      where: { vesselId_year: { vesselId, year } },
      create: {
        vesselId,
        accountId: account.id,
        year,
        totalCo2Mt,
        applicablePct: phaseInPct,
        obligationMt: totalObligationMt,
        euaSurrendered: 0,
        surrenderDeadline,
        isSettled: false,
      },
      update: {
        totalCo2Mt,
        applicablePct: phaseInPct,
        obligationMt: totalObligationMt,
        surrenderDeadline,
        updatedAt: new Date(),
      },
    });

    logger.info(
      { vesselId, year, obligationMt: totalObligationMt.toFixed(2), costEur: totalEstimatedCostEur.toFixed(0) },
      'ETS record updated',
    );
  }

  /**
   * Batch calculate ETS for all vessels in an organization.
   */
  async calculateFleetEts(
    organizationId: string,
    year: number,
    prisma: PrismaClient,
  ): Promise<{ processed: number; failed: number }> {
    const vessels = await prisma.vessel.findMany({
      where: { organizationId },
      select: { id: true, name: true },
    });

    let processed = 0;
    let failed = 0;

    for (const vessel of vessels) {
      try {
        await this.calculateAndPersist(vessel.id, year, prisma);
        processed++;
      } catch (err) {
        logger.error({ vesselId: vessel.id, err }, 'Fleet ETS calc failed');
        failed++;
      }
    }

    return { processed, failed };
  }

  /**
   * Record a surrender of EUAs against a vessel/year record.
   * Marks as settled when obligation is met.
   */
  async recordSurrender(
    vesselId: string,
    year: number,
    euaAmount: number,
    accountId: string,
    prisma: PrismaClient,
  ): Promise<void> {
    const record = await prisma.etsRecord.findUniqueOrThrow({
      where: { vesselId_year: { vesselId, year } },
    });

    const newSurrendered = record.euaSurrendered + euaAmount;
    const isSettled = newSurrendered >= record.obligationMt;

    await prisma.$transaction([
      // Update ETS record
      prisma.etsRecord.update({
        where: { vesselId_year: { vesselId, year } },
        data: { euaSurrendered: newSurrendered, isSettled },
      }),
      // Deduct from account balance
      prisma.etsAccount.update({
        where: { id: accountId },
        data: { euaBalance: { decrement: euaAmount } },
      }),
      // Log the transaction
      prisma.etsTransaction.create({
        data: {
          accountId,
          type: 'surrender',
          euaAmount,
          transactedAt: new Date(),
          notes: `Surrender for vessel ${vesselId} year ${year}`,
        },
      }),
    ]);

    logger.info(
      { vesselId, year, euaAmount, isSettled },
      'ETS surrender recorded',
    );
  }
}

export const etsService = new EtsService();
