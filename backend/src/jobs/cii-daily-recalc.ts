/**
 * BullMQ Job: cii-daily-recalc
 * Runs nightly at 02:00 UTC
 * Recalculates CII for all vessels with completed voyages this year
 */

import { Worker, Queue } from 'bullmq';
import { redis } from '../lib/redis.js';
import { prisma } from '../lib/prisma.js';
import { ciiService } from '../services/cii/cii-service.js';
import { logger } from '../utils/logger.js';

export const ciiRecalcQueue = new Queue('cii-daily-recalc', { connection: redis });

export const ciiRecalcWorker = new Worker(
  'cii-daily-recalc',
  async (job) => {
    const year = job.data.year ?? new Date().getFullYear();
    logger.info({ year }, 'Starting CII daily recalculation');

    const vessels = await prisma.vessel.findMany({
      where: {
        voyages: {
          some: {
            status: 'completed',
            departureAt: { gte: new Date(`${year}-01-01`) },
          },
        },
      },
      select: { id: true, name: true, imo: true },
    });

    let processed = 0;
    let failed = 0;

    for (const vessel of vessels) {
      try {
        await ciiService.calculateAndPersist(vessel.id, year, prisma);
        processed++;
      } catch (err) {
        logger.error({ vesselId: vessel.id, err }, 'CII recalc failed for vessel');
        failed++;
      }
    }

    logger.info({ year, processed, failed }, 'CII daily recalculation complete');
    return { processed, failed };
  },
  { connection: redis, concurrency: 5 },
);

/**
 * Schedule daily CII recalculation.
 * Call this from main.ts on startup.
 */
export async function scheduleCiiDailyRecalc() {
  await ciiRecalcQueue.upsertJobScheduler(
    'cii-daily-2am',
    { pattern: '0 2 * * *' },       // Every day at 02:00 UTC
    { name: 'cii-daily-recalc', data: {} },
  );
  logger.info('CII daily recalculation scheduled at 02:00 UTC');
}
