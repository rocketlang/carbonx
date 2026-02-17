import SchemaBuilder from '@pothos/core';
import PrismaPlugin from '@pothos/plugin-prisma';
import type PrismaTypes from '../../generated/prisma/index.js';
import { prisma } from '../lib/prisma.js';
import type { GraphQLContext } from './context.js';

export const builder = new SchemaBuilder<{
  PrismaTypes: PrismaTypes;
  Context: GraphQLContext;
  Scalars: {
    DateTime: { Input: Date; Output: Date };
    JSON: { Input: unknown; Output: unknown };
  };
}>({
  plugins: [PrismaPlugin],
  prisma: {
    client: prisma,
    exposeDescriptions: true,
    filterConnectionTotalCount: true,
  },
});

builder.queryType({ description: 'CarbonX queries' });
builder.mutationType({ description: 'CarbonX mutations' });

builder.scalarType('DateTime', {
  serialize: (value) => (value instanceof Date ? value.toISOString() : String(value)),
  parseValue: (value) => (typeof value === 'string' ? new Date(value) : null),
});

builder.scalarType('JSON', {
  serialize: (value) => value,
  parseValue: (value) => value,
});
