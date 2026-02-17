/**
 * BullMQ Job: ets-price-sync
 * Syncs EUA carbon price every 15 minutes during trading hours.
 * Falls back to simulated price when no API key is configured.
 */

import { Worker, Queue } from 'bullmq';
import { redis } from '../lib/redis.js';
import { prisma } from '../lib/prisma.js';
import { carbonPriceService } from '../services/ets/carbon-price.service.js';
import { logger } from '../utils/logger.js';

export const etsPriceQueue = new Queue('ets-price-sync', { connection: redis });

export const etsPriceWorker = new Worker(
  'ets-price-sync',
  async () => {
    try {
      const result = await carbonPriceService.fetchAndStoreLatestPrice(prisma);
      logger.debug({ price: result.priceEur, source: result.source }, 'EUA price synced');
      return result;
    } catch (err) {
      logger.error({ err }, 'ETS price sync failed');
      throw err;
    }
  },
  { connection: redis, concurrency: 1 },
);

export async function scheduleEtsPriceSync() {
  await etsPriceQueue.upsertJobScheduler(
    'ets-price-15min',
    { pattern: '*/15 * * * *' },   // Every 15 minutes
    { name: 'ets-price-sync', data: {} },
  );
  logger.info('ETS price sync scheduled — every 15 minutes');
}
