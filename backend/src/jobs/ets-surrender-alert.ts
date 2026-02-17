/**
 * BullMQ Job: ets-surrender-alert
 * Runs daily at 07:00 UTC.
 * Alerts when the 30 April EUA surrender deadline is within:
 *   - 60 days (info)
 *   - 30 days (warning)
 *   - 14 days (critical)
 *   - 7 days (urgent)
 */

import { Worker, Queue } from 'bullmq';
import { redis } from '../lib/redis.js';
import { prisma } from '../lib/prisma.js';
import { daysUntilSurrender, getSurrenderDeadline } from '../services/ets/ets-calculator.js';
import { logger } from '../utils/logger.js';

export const etsSurrenderQueue = new Queue('ets-surrender-alert', { connection: redis });

export const etsSurrenderWorker = new Worker(
  'ets-surrender-alert',
  async (job) => {
    const year = job.data.year ?? new Date().getFullYear() - 1;  // Surrender is for previous year
    const days = daysUntilSurrender(year);
    const deadline = getSurrenderDeadline(year);

    if (days < 0) {
      logger.info({ year, days }, 'ETS surrender deadline already passed');
      return { year, days, status: 'past_deadline' };
    }

    // Get all unsettled ETS records for this year
    const unsettled = await prisma.etsRecord.findMany({
      where: { year, isSettled: false },
      include: {
        vessel: { select: { name: true, imo: true } },
        account: { select: { euaBalance: true, organizationId: true } },
      },
    });

    if (unsettled.length === 0) {
      logger.info({ year }, 'All ETS obligations settled — no alerts needed');
      return { year, days, status: 'all_settled' };
    }

    const severity = days <= 7 ? 'URGENT' : days <= 14 ? 'CRITICAL' : days <= 30 ? 'WARNING' : 'INFO';

    let totalShortfallMt = 0;
    for (const r of unsettled) {
      const shortfall = r.obligationMt - r.euaSurrendered;
      if (shortfall > 0) totalShortfallMt += shortfall;
    }

    logger.warn(
      {
        year,
        days,
        severity,
        deadline: deadline.toISOString(),
        unsettledVessels: unsettled.length,
        totalShortfallMt: totalShortfallMt.toFixed(2),
      },
      `[${severity}] ETS surrender deadline in ${days} days — ${unsettled.length} vessels unsettled, ${totalShortfallMt.toFixed(0)} t CO₂ shortfall`,
    );

    // Log individual vessel alerts
    for (const r of unsettled) {
      const shortfall = Math.max(0, r.obligationMt - r.euaSurrendered);
      if (shortfall > 0) {
        logger.warn(
          {
            vesselName: r.vessel.name,
            imo: r.vessel.imo,
            shortfallMt: shortfall.toFixed(2),
            euaBalance: r.account.euaBalance,
          },
          `ETS shortfall: ${r.vessel.name} needs ${shortfall.toFixed(0)} more EUAs`,
        );
      }
    }

    return {
      year,
      days,
      severity,
      unsettledVessels: unsettled.length,
      totalShortfallMt,
      status: 'alerts_generated',
    };
  },
  { connection: redis, concurrency: 1 },
);

export async function scheduleEtsSurrenderAlert() {
  await etsSurrenderQueue.upsertJobScheduler(
    'ets-surrender-daily',
    { pattern: '0 7 * * *' },      // Every day at 07:00 UTC
    { name: 'ets-surrender-alert', data: {} },
  );
  logger.info('ETS surrender alert scheduled — daily 07:00 UTC');
}
