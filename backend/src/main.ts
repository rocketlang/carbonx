import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import mercurius from 'mercurius';
import { schema } from './schema/index.js';
import { buildContext } from './schema/context.js';
import { logger } from './utils/logger.js';
import { scheduleCiiDailyRecalc } from './jobs/cii-daily-recalc.js';
import { scheduleCiiDowngradeMonitor } from './jobs/cii-downgrade-monitor.js';
import { scheduleEtsPriceSync } from './jobs/ets-price-sync.js';
import { scheduleEtsSurrenderAlert } from './jobs/ets-surrender-alert.js';

const app = Fastify({ logger: false });

await app.register(cors, { origin: true });
await app.register(jwt, {
  secret: process.env.JWT_SECRET || 'carbonx-dev-secret-change-in-prod',
});

await app.register(mercurius, {
  schema,
  context: buildContext,
  graphiql: process.env.NODE_ENV !== 'production',
  path: '/graphql',
});

app.get('/health', async () => ({
  status: 'ok',
  service: 'carbonx-backend',
  version: '1.0.0',
  timestamp: new Date().toISOString(),
}));

const port = Number(process.env.PORT) || 4053;
const host = process.env.HOST || '0.0.0.0';

try {
  await app.listen({ port, host });
  logger.info(`CarbonX API → http://${host}:${port}/graphql`);

  // Phase 2 — CII Jobs
  await scheduleCiiDailyRecalc();
  await scheduleCiiDowngradeMonitor();

  // Phase 3 — ETS Jobs
  await scheduleEtsPriceSync();
  await scheduleEtsSurrenderAlert();

  logger.info('All background jobs scheduled');
} catch (err) {
  logger.error(err);
  process.exit(1);
}
