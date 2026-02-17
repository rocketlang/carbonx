/**
 * CII — Carbon Intensity Indicator
 * IMO MARPOL Annex VI, Resolution MEPC.337(76)
 *
 * Formula: Attained CII = CO₂ emissions (g) / (DWT × Distance nm)
 * Rating:  A (best) → E (worst) vs required CII per vessel type
 */

import { builder } from '../builder.js';
import { ciiService } from '../../services/cii/cii-service.js';

// ─────────────────────────────────────────────
// PRISMA OBJECT
// ─────────────────────────────────────────────

builder.prismaObject('CiiRecord', {
  description: 'Annual CII calculation record for a vessel',
  fields: (t) => ({
    id: t.exposeID('id'),
    vesselId: t.exposeString('vesselId'),
    year: t.exposeInt('year'),

    totalDistanceNm: t.exposeFloat('totalDistanceNm'),
    totalCo2G: t.exposeFloat('totalCo2G'),
    dwt: t.exposeFloat('dwt'),

    attainedCii: t.exposeFloat('attainedCii', { nullable: true }),
    requiredCii: t.exposeFloat('requiredCii', { nullable: true }),
    ciiRatio: t.exposeFloat('ciiRatio', { nullable: true }),
    rating: t.exposeString('rating', { nullable: true }),

    iceCorrectionApplied: t.exposeBoolean('iceCorrectionApplied'),
    shuttleCorrectionApplied: t.exposeBoolean('shuttleCorrectionApplied'),
    yearEndProjection: t.exposeString('yearEndProjection', { nullable: true }),

    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),

    vessel: t.relation('vessel'),
  }),
});

// ─────────────────────────────────────────────
// CUSTOM TYPES
// ─────────────────────────────────────────────

const CiiRatingCount = builder.objectRef<{ rating: string; count: number }>('CiiRatingCount');
CiiRatingCount.implement({
  fields: (t) => ({
    rating: t.exposeString('rating'),
    count: t.exposeInt('count'),
  }),
});

const FleetCiiDashboard = builder.objectRef<{
  totalVessels: number;
  ratingDistribution: { rating: string; count: number }[];
  avgCiiRatio: number;
  atRiskCount: number;
}>('FleetCiiDashboard');

FleetCiiDashboard.implement({
  fields: (t) => ({
    totalVessels: t.exposeInt('totalVessels'),
    ratingDistribution: t.field({
      type: [CiiRatingCount],
      resolve: (p) => p.ratingDistribution,
    }),
    avgCiiRatio: t.exposeFloat('avgCiiRatio'),
    atRiskCount: t.exposeInt('atRiskCount'),
  }),
});

// ─────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────

builder.queryField('ciiRecord', (t) =>
  t.prismaField({
    type: 'CiiRecord',
    nullable: true,
    description: 'Get CII record for a vessel and year',
    args: {
      vesselId: t.arg.string({ required: true }),
      year: t.arg.int({ required: true }),
    },
    resolve: (query, _root, args, ctx) =>
      ctx.prisma.ciiRecord.findUnique({
        ...query,
        where: { vesselId_year: { vesselId: args.vesselId, year: args.year } },
      }),
  }),
);

builder.queryField('vesselCiiTimeline', (t) =>
  t.prismaField({
    type: ['CiiRecord'],
    description: 'Get multi-year CII history for a vessel',
    args: {
      vesselId: t.arg.string({ required: true }),
      fromYear: t.arg.int({ required: true }),
      toYear: t.arg.int({ required: true }),
    },
    resolve: (query, _root, args, ctx) =>
      ctx.prisma.ciiRecord.findMany({
        ...query,
        where: {
          vesselId: args.vesselId,
          year: { gte: args.fromYear, lte: args.toYear },
        },
        orderBy: { year: 'asc' },
      }),
  }),
);

builder.queryField('fleetCiiDashboard', (t) =>
  t.field({
    type: FleetCiiDashboard,
    description: 'Fleet-wide CII summary for a given year',
    args: { year: t.arg.int({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const records = await ctx.prisma.ciiRecord.findMany({
        where: { year: args.year, vessel: ctx.orgFilter() },
        include: { vessel: true },
      });

      const ratingCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
      let totalRatio = 0;
      let atRisk = 0;

      for (const r of records) {
        const rating = r.rating ?? 'C';
        ratingCounts[rating] = (ratingCounts[rating] ?? 0) + 1;
        totalRatio += r.ciiRatio ?? 1;
        if (rating === 'D' || rating === 'E') atRisk++;
      }

      return {
        totalVessels: records.length,
        ratingDistribution: Object.entries(ratingCounts).map(([rating, count]) => ({ rating, count })),
        avgCiiRatio: records.length > 0 ? totalRatio / records.length : 0,
        atRiskCount: atRisk,
      };
    },
  }),
);

// ─────────────────────────────────────────────
// MUTATIONS
// ─────────────────────────────────────────────

builder.mutationField('calculateCiiRecord', (t) =>
  t.prismaField({
    type: 'CiiRecord',
    description: 'Calculate (or recalculate) CII for a vessel/year using voyage data',
    args: {
      vesselId: t.arg.string({ required: true }),
      year: t.arg.int({ required: true }),
    },
    resolve: async (query, _root, args, ctx) => {
      const result = await ciiService.calculateAndPersist(
        args.vesselId,
        args.year,
        ctx.prisma,
      );
      return ctx.prisma.ciiRecord.findUniqueOrThrow({
        ...query,
        where: { vesselId_year: { vesselId: args.vesselId, year: args.year } },
      });
    },
  }),
);
