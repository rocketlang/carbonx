/**
 * CII GraphQL Schema — Carbon Intensity Indicator
 * IMO MARPOL Annex VI, Resolution MEPC.337(76) + MEPC.354(78)
 */

import { builder } from '../builder.js';
import { ciiService } from '../../services/cii/cii-service.js';
import { simulateCii, calculateCo2Budget } from '../../services/cii/cii-calculator.js';

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
// CUSTOM RESPONSE TYPES
// ─────────────────────────────────────────────

const CiiRatingCount = builder.objectRef<{ rating: string; count: number }>('CiiRatingCount');
CiiRatingCount.implement({
  fields: (t) => ({
    rating: t.exposeString('rating'),
    count: t.exposeInt('count'),
  }),
});

const AtRiskVessel = builder.objectRef<{
  vesselId: string;
  name: string;
  imo: string;
  rating: string;
  ciiRatio: number;
  consecutiveDYears: number;
}>('AtRiskVessel');
AtRiskVessel.implement({
  fields: (t) => ({
    vesselId: t.exposeString('vesselId'),
    name: t.exposeString('name'),
    imo: t.exposeString('imo'),
    rating: t.exposeString('rating'),
    ciiRatio: t.exposeFloat('ciiRatio'),
    consecutiveDYears: t.exposeInt('consecutiveDYears'),
  }),
});

const FleetCiiDashboard = builder.objectRef<{
  totalVessels: number;
  ratingDistribution: { rating: string; count: number }[];
  avgCiiRatio: number;
  atRiskCount: number;
  bestRatedCount: number;
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
    bestRatedCount: t.exposeInt('bestRatedCount'),
  }),
});

const CiiSimulationResult = builder.objectRef<{
  newCiiRatio: number;
  newRating: string;
  co2ReductionPct: number;
  ratingChange: string;
  co2BudgetKgForTargetRating: number;
}>('CiiSimulationResult');
CiiSimulationResult.implement({
  fields: (t) => ({
    newCiiRatio: t.exposeFloat('newCiiRatio'),
    newRating: t.exposeString('newRating'),
    co2ReductionPct: t.exposeFloat('co2ReductionPct'),
    ratingChange: t.exposeString('ratingChange'),
    co2BudgetKgForTargetRating: t.exposeFloat('co2BudgetKgForTargetRating'),
  }),
});

// ─────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────

builder.queryField('ciiRecord', (t) =>
  t.prismaField({
    type: 'CiiRecord',
    nullable: true,
    description: 'Get the CII record for a specific vessel and year',
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
    description: 'Multi-year CII history for a vessel (for trend chart)',
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
    description: 'Fleet-wide CII summary for the dashboard',
    args: { year: t.arg.int({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const records = await ctx.prisma.ciiRecord.findMany({
        where: { year: args.year, vessel: ctx.orgFilter() },
      });

      const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
      let totalRatio = 0;
      let atRisk = 0;
      let best = 0;

      for (const r of records) {
        const rating = r.rating ?? 'C';
        counts[rating] = (counts[rating] ?? 0) + 1;
        totalRatio += r.ciiRatio ?? 1;
        if (rating === 'D' || rating === 'E') atRisk++;
        if (rating === 'A') best++;
      }

      return {
        totalVessels: records.length,
        ratingDistribution: ['A', 'B', 'C', 'D', 'E'].map((r) => ({
          rating: r,
          count: counts[r] ?? 0,
        })),
        avgCiiRatio: records.length > 0 ? totalRatio / records.length : 0,
        atRiskCount: atRisk,
        bestRatedCount: best,
      };
    },
  }),
);

builder.queryField('atRiskVessels', (t) =>
  t.field({
    type: [AtRiskVessel],
    description: 'Vessels with D or E rating or consecutive D years (require corrective action)',
    args: { year: t.arg.int({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const records = await ctx.prisma.ciiRecord.findMany({
        where: {
          year: args.year,
          rating: { in: ['D', 'E'] },
          vessel: ctx.orgFilter(),
        },
        include: { vessel: { select: { name: true, imo: true, type: true } } },
        orderBy: { ciiRatio: 'desc' },
      });

      // For each D-rated vessel, count consecutive D years
      const results = await Promise.all(
        records.map(async (r) => {
          let consecutiveDYears = 0;
          if (r.rating === 'D') {
            // Look back up to 3 years
            for (let y = args.year - 1; y >= args.year - 3; y--) {
              const prev = await ctx.prisma.ciiRecord.findUnique({
                where: { vesselId_year: { vesselId: r.vesselId, year: y } },
                select: { rating: true },
              });
              if (prev?.rating === 'D') consecutiveDYears++;
              else break;
            }
          }
          return {
            vesselId: r.vesselId,
            name: r.vessel.name,
            imo: r.vessel.imo,
            rating: r.rating ?? 'D',
            ciiRatio: r.ciiRatio ?? 1,
            consecutiveDYears,
          };
        }),
      );

      return results;
    },
  }),
);

builder.queryField('simulateCiiImprovement', (t) =>
  t.field({
    type: CiiSimulationResult,
    description: 'What-if CII simulation — model speed reduction or fuel switch impact',
    args: {
      vesselId: t.arg.string({ required: true }),
      year: t.arg.int({ required: true }),
      speedReductionPct: t.arg.float(),    // 0.05 = 5% speed reduction
      fuelSwitchPct: t.arg.float(),        // 0.20 = 20% of HFO replaced
      newFuelType: t.arg.string(),         // lng, methanol, biofuel, etc.
      targetRating: t.arg.string(),        // A, B, C, D — for budget calc
    },
    resolve: async (_root, args, ctx) => {
      const record = await ctx.prisma.ciiRecord.findUnique({
        where: { vesselId_year: { vesselId: args.vesselId, year: args.year } },
        include: { vessel: { select: { type: true, dwt: true } } },
      });

      if (!record) throw new Error(`No CII record for vessel ${args.vesselId} in ${args.year}`);

      const sim = simulateCii({
        currentCo2G: record.totalCo2G,
        currentDistanceNm: record.totalDistanceNm,
        dwt: record.dwt,
        vesselType: record.vessel.type,
        year: args.year,
        speedReductionPct: args.speedReductionPct ?? undefined,
        fuelSwitchPct: args.fuelSwitchPct ?? undefined,
        newFuelType: args.newFuelType as any ?? undefined,
      });

      const targetRating = (args.targetRating ?? 'C') as 'A' | 'B' | 'C' | 'D';
      const budget = calculateCo2Budget(
        record.vessel.type,
        record.dwt,
        args.year,
        record.totalDistanceNm,
        targetRating,
      );

      return {
        newCiiRatio: sim.newCiiRatio,
        newRating: sim.newRating,
        co2ReductionPct: sim.co2Reduction,
        ratingChange: sim.ratingChange,
        co2BudgetKgForTargetRating: budget / 1000, // g → kg
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
    nullable: true,
    description: 'Trigger CII calculation for a vessel/year from voyage data',
    args: {
      vesselId: t.arg.string({ required: true }),
      year: t.arg.int({ required: true }),
    },
    resolve: async (query, _root, args, ctx) => {
      await ciiService.calculateAndPersist(args.vesselId, args.year, ctx.prisma);
      return ctx.prisma.ciiRecord.findUnique({
        ...query,
        where: { vesselId_year: { vesselId: args.vesselId, year: args.year } },
      });
    },
  }),
);

builder.mutationField('updateCiiCorrections', (t) =>
  t.prismaField({
    type: 'CiiRecord',
    description: 'Update correction flags on a CII record (ice class, shuttle tanker)',
    args: {
      vesselId: t.arg.string({ required: true }),
      year: t.arg.int({ required: true }),
      iceCorrectionApplied: t.arg.boolean(),
      shuttleCorrectionApplied: t.arg.boolean(),
    },
    resolve: async (query, _root, args, ctx) => {
      // Update the flags then recalculate
      await ctx.prisma.ciiRecord.update({
        where: { vesselId_year: { vesselId: args.vesselId, year: args.year } },
        data: {
          ...(args.iceCorrectionApplied != null && {
            iceCorrectionApplied: args.iceCorrectionApplied,
          }),
          ...(args.shuttleCorrectionApplied != null && {
            shuttleCorrectionApplied: args.shuttleCorrectionApplied,
          }),
        },
      });

      // Recalculate with corrections applied
      await ciiService.calculateAndPersist(args.vesselId, args.year, ctx.prisma);

      return ctx.prisma.ciiRecord.findUniqueOrThrow({
        ...query,
        where: { vesselId_year: { vesselId: args.vesselId, year: args.year } },
      });
    },
  }),
);
