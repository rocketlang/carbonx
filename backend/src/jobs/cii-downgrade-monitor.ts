/**
 * BullMQ Job: cii-downgrade-monitor
 * Runs weekly (Monday 03:00 UTC)
 *
 * Finds vessels at D/E rating or approaching a rating downgrade
 * and emits structured alerts.
 *
 * IMO rule: 3 consecutive D ratings OR 1 E rating = mandatory SEEMP rectification plan
 */

import { Worker, Queue } from 'bullmq';
import { redis } from '../lib/redis.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';

export const ciiDowngradeQueue = new Queue('cii-downgrade-monitor', {
  connection: redis,
});

interface DowngradeAlert {
  vesselId: string;
  vesselName: string;
  imo: string;
  currentRating: string;
  currentYear: number;
  ciiRatio: number;
  severity: 'warning' | 'critical';
  reason: string;
  rectificationRequired: boolean;
}

export const ciiDowngradeWorker = new Worker(
  'cii-downgrade-monitor',
  async (job) => {
    const year = job.data.year ?? new Date().getFullYear();
    logger.info({ year }, 'Starting CII downgrade monitor');

    const alerts: DowngradeAlert[] = [];

    // Get all vessels with CII records for the current year
    const currentRecords = await prisma.ciiRecord.findMany({
      where: { year },
      include: { vessel: { select: { name: true, imo: true } } },
    });

    for (const record of currentRecords) {
      const rating = record.rating ?? 'C';

      // E rating = immediate critical alert
      if (rating === 'E') {
        alerts.push({
          vesselId: record.vesselId,
          vesselName: record.vessel.name,
          imo: record.vessel.imo,
          currentRating: rating,
          currentYear: year,
          ciiRatio: record.ciiRatio ?? 1,
          severity: 'critical',
          reason: 'E rating requires immediate corrective action and SEEMP III rectification plan',
          rectificationRequired: true,
        });
        continue;
      }

      // D rating — check consecutive years
      if (rating === 'D') {
        const previousYears = await prisma.ciiRecord.findMany({
          where: {
            vesselId: record.vesselId,
            year: { gte: year - 3, lt: year },
            rating: 'D',
          },
          orderBy: { year: 'desc' },
          take: 3,
        });

        const consecutiveD = previousYears.length;

        if (consecutiveD >= 2) {
          // 3rd consecutive D (this year + 2 previous) = rectification required
          alerts.push({
            vesselId: record.vesselId,
            vesselName: record.vessel.name,
            imo: record.vessel.imo,
            currentRating: rating,
            currentYear: year,
            ciiRatio: record.ciiRatio ?? 1,
            severity: 'critical',
            reason: `${consecutiveD + 1} consecutive D ratings — SEEMP III rectification plan mandatory`,
            rectificationRequired: true,
          });
        } else {
          alerts.push({
            vesselId: record.vesselId,
            vesselName: record.vessel.name,
            imo: record.vessel.imo,
            currentRating: rating,
            currentYear: year,
            ciiRatio: record.ciiRatio ?? 1,
            severity: 'warning',
            reason: `D rating for ${consecutiveD + 1} year(s) — action needed to avoid mandatory rectification`,
            rectificationRequired: false,
          });
        }
        continue;
      }

      // C rating approaching D — warn if CII ratio is close to C/D boundary
      if (rating === 'C' && (record.ciiRatio ?? 0) > 1.05) {
        alerts.push({
          vesselId: record.vesselId,
          vesselName: record.vessel.name,
          imo: record.vessel.imo,
          currentRating: rating,
          currentYear: year,
          ciiRatio: record.ciiRatio ?? 1,
          severity: 'warning',
          reason: 'C rating close to D boundary — consider slow steaming or fuel efficiency measures',
          rectificationRequired: false,
        });
      }
    }

    // Log all alerts
    if (alerts.length > 0) {
      logger.warn(
        { year, alertCount: alerts.length, critical: alerts.filter((a) => a.severity === 'critical').length },
        'CII downgrade alerts generated',
      );

      for (const alert of alerts) {
        logger.warn(
          { alert },
          `CII ALERT [${alert.severity.toUpperCase()}] ${alert.vesselName} (${alert.imo}): ${alert.reason}`,
        );
      }
    } else {
      logger.info({ year }, 'CII downgrade monitor: no alerts');
    }

    return {
      year,
      alertsTotal: alerts.length,
      critical: alerts.filter((a) => a.severity === 'critical').length,
      warnings: alerts.filter((a) => a.severity === 'warning').length,
      rectificationRequired: alerts.filter((a) => a.rectificationRequired).length,
      alerts,
    };
  },
  { connection: redis, concurrency: 1 },
);

/**
 * Schedule weekly downgrade monitoring.
 */
export async function scheduleCiiDowngradeMonitor() {
  await ciiDowngradeQueue.upsertJobScheduler(
    'cii-downgrade-weekly',
    { pattern: '0 3 * * 1' },    // Monday 03:00 UTC
    { name: 'cii-downgrade-monitor', data: {} },
  );
  logger.info('CII downgrade monitor scheduled — Mondays 03:00 UTC');
}
