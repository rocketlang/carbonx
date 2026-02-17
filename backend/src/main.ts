import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import mercurius from 'mercurius';
import { schema } from './schema/index.js';
import { buildContext } from './schema/context.js';
import { logger } from './utils/logger.js';

const app = Fastify({ logger: false });

await app.register(cors, { origin: true });
await app.register(jwt, { secret: process.env.JWT_SECRET || 'carbonx-dev-secret' });

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

const port = Number(process.env.PORT) || 4052;
const host = process.env.HOST || '0.0.0.0';

try {
  await app.listen({ port, host });
  logger.info(`CarbonX API running on http://${host}:${port}/graphql`);
} catch (err) {
  logger.error(err);
  process.exit(1);
}
