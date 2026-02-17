import type { PrismaClient } from '../../../generated/prisma/index.js';
import {
  calculateRequiredCii,
  getCiiRating,
  getCiiBoundaries,
  projectYearEndCii,
  CO2_FACTORS,
} from './cii-calculator.js';
import { logger } from '../../utils/logger.js';

class CiiService {
  /**
   * Aggregate all completed voyages for a vessel/year,
   * calculate CII, and upsert a CiiRecord.
   */
  async calculateAndPersist(
    vesselId: string,
    year: number,
    prisma: PrismaClient,
  ): Promise<void> {
    const vessel = await prisma.vessel.findUniqueOrThrow({
      where: { id: vesselId },
    });

    const yearStart = new Date(`${year}-01-01T00:00:00Z`);
    const yearEnd   = new Date(`${year}-12-31T23:59:59Z`);

    const voyages = await prisma.voyage.findMany({
      where: {
        vesselId,
        status: { in: ['completed', 'verified'] },
        departureAt: { gte: yearStart, lte: yearEnd },
      },
    });

    if (voyages.length === 0) {
      logger.warn({ vesselId, year }, 'No completed voyages — skipping CII calculation');
      return;
    }

    // Read existing correction flags if a record already exists
    const existingRecord = await prisma.ciiRecord.findUnique({
      where: { vesselId_year: { vesselId, year } },
      select: { iceCorrectionApplied: true, shuttleCorrectionApplied: true },
    });

    // Aggregate fuel and distance across all voyages
    let totalDistanceNm = 0;
    let totalCo2G = 0;
    let ytdDistanceNm = 0;
    let ytdCo2G = 0;

    const now = new Date();
    const isCurrentYear = year === now.getFullYear();

    for (const voyage of voyages) {
      const co2G =
        voyage.hfoConsumedMt        * CO2_FACTORS.hfo      * 1_000_000 +
        voyage.mgoConsumedMt        * CO2_FACTORS.mgo      * 1_000_000 +
        voyage.lngConsumedMt        * CO2_FACTORS.lng      * 1_000_000 +
        voyage.methanolConsumedMt   * CO2_FACTORS.methanol * 1_000_000 +
        voyage.biofuelConsumedMt    * CO2_FACTORS.biofuel  * 1_000_000;

      totalDistanceNm += voyage.distanceNm;
      totalCo2G += co2G;

      // YTD = voyages up to today (for projection)
      if (isCurrentYear && voyage.departureAt <= now) {
        ytdDistanceNm += voyage.distanceNm;
        ytdCo2G += co2G;
      }
    }

    // Apply ice correction if flagged — reduce effective DWT
    let effectiveDwt = vessel.dwt;
    if (existingRecord?.iceCorrectionApplied) {
      effectiveDwt *= 0.90; // IA ice class reduction
    }

    // Calculate CII
    const attainedCii = totalDistanceNm > 0
      ? totalCo2G / (effectiveDwt * totalDistanceNm)
      : 0;

    const { requiredCii, reductionFactor } = calculateRequiredCii(
      vessel.type,
      effectiveDwt,
      year,
    );

    const ciiRatio = requiredCii > 0 ? attainedCii / requiredCii : 1;
    const rating = getCiiRating(ciiRatio, vessel.type);

    // Year-end projection (for current year)
    let yearEndProjection: string | null = null;
    if (isCurrentYear && ytdDistanceNm > 0) {
      // Estimate full-year distance based on YTD pace
      const dayOfYear = Math.floor(
        (now.getTime() - new Date(`${year}-01-01`).getTime()) / 86_400_000,
      );
      const fullYearDistanceEstimate = dayOfYear > 0
        ? (ytdDistanceNm / dayOfYear) * 365
        : totalDistanceNm;

      const { projectedRating } = projectYearEndCii(
        ytdCo2G,
        ytdDistanceNm,
        fullYearDistanceEstimate,
        vessel.type,
        effectiveDwt,
        year,
      );
      yearEndProjection = projectedRating;
    }

    await prisma.ciiRecord.upsert({
      where: { vesselId_year: { vesselId, year } },
      create: {
        vesselId,
        year,
        totalDistanceNm,
        totalCo2G,
        dwt: effectiveDwt,
        attainedCii,
        requiredCii,
        ciiRatio,
        rating,
        yearEndProjection,
        iceCorrectionApplied:     existingRecord?.iceCorrectionApplied     ?? false,
        shuttleCorrectionApplied: existingRecord?.shuttleCorrectionApplied ?? false,
      },
      update: {
        totalDistanceNm,
        totalCo2G,
        dwt: effectiveDwt,
        attainedCii,
        requiredCii,
        ciiRatio,
        rating,
        yearEndProjection,
        updatedAt: new Date(),
      },
    });

    logger.info(
      { vesselId, year, rating, ciiRatio: ciiRatio.toFixed(3), reductionFactor },
      'CII record updated',
    );
  }

  /**
   * Batch calculate CII for all vessels in an organization for a given year.
   */
  async calculateFleet(
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
        logger.error({ vesselId: vessel.id, err }, 'Fleet CII batch calc failed');
        failed++;
      }
    }

    return { processed, failed };
  }
}

export const ciiService = new CiiService();
