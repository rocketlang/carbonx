import type { PrismaClient } from '../../../generated/prisma/index.js';
import {
  calculateCii,
  calculateCo2Grams,
  CO2_FACTORS,
} from './cii-calculator.js';
import { logger } from '../../utils/logger.js';

class CiiService {
  /**
   * Aggregate voyage fuel data for a vessel/year and persist a CiiRecord.
   * Called by the GraphQL mutation and the nightly BullMQ job.
   */
  async calculateAndPersist(
    vesselId: string,
    year: number,
    prisma: PrismaClient,
  ): Promise<void> {
    const vessel = await prisma.vessel.findUniqueOrThrow({ where: { id: vesselId } });

    const yearStart = new Date(`${year}-01-01T00:00:00Z`);
    const yearEnd = new Date(`${year}-12-31T23:59:59Z`);

    const voyages = await prisma.voyage.findMany({
      where: {
        vesselId,
        status: 'completed',
        departureAt: { gte: yearStart, lte: yearEnd },
      },
    });

    if (voyages.length === 0) {
      logger.warn({ vesselId, year }, 'No completed voyages found for CII calculation');
      return;
    }

    // Aggregate totals
    let totalDistanceNm = 0;
    let totalCo2G = 0;

    for (const voyage of voyages) {
      totalDistanceNm += voyage.distanceNm;
      // Sum up all fuel types using CO2 factors
      totalCo2G += voyage.hfoConsumedMt * CO2_FACTORS.hfo * 1_000_000;
      totalCo2G += voyage.mgoConsumedMt * CO2_FACTORS.mgo * 1_000_000;
      totalCo2G += voyage.lngConsumedMt * CO2_FACTORS.lng * 1_000_000;
      totalCo2G += voyage.methanolConsumedMt * CO2_FACTORS.methanol * 1_000_000;
    }

    const result = calculateCii({
      vesselType: vessel.type,
      dwt: vessel.dwt,
      distanceNm: totalDistanceNm,
      fuelConsumption: [{ type: 'hfo', metricTonnes: 0 }], // Already summed above
      year,
    });

    // Override with pre-aggregated CO2
    const attainedCii = totalCo2G / (vessel.dwt * totalDistanceNm);
    const ciiRatio = attainedCii / result.requiredCii;

    await prisma.ciiRecord.upsert({
      where: { vesselId_year: { vesselId, year } },
      create: {
        vesselId,
        year,
        totalDistanceNm,
        totalCo2G,
        dwt: vessel.dwt,
        attainedCii,
        requiredCii: result.requiredCii,
        ciiRatio,
        rating: result.rating,
      },
      update: {
        totalDistanceNm,
        totalCo2G,
        dwt: vessel.dwt,
        attainedCii,
        requiredCii: result.requiredCii,
        ciiRatio,
        rating: result.rating,
        updatedAt: new Date(),
      },
    });

    logger.info({ vesselId, year, rating: result.rating }, 'CII record updated');
  }
}

export const ciiService = new CiiService();
