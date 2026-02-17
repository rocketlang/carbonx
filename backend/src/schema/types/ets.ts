/**
 * EU ETS GraphQL Schema
 * EU ETS Directive 2003/87/EC — Shipping from Jan 2024
 */

import { builder } from '../builder.js';
import { etsService } from '../../services/ets/ets-service.js';
import { carbonPriceService } from '../../services/ets/carbon-price.service.js';
import {
  classifyEtsScope,
  getSurrenderDeadline,
  daysUntilSurrender,
  forecastFullYearEtsCost,
  ETS_PHASE_IN,
} from '../../services/ets/ets-calculator.js';

// ─────────────────────────────────────────────
// PRISMA OBJECTS
// ─────────────────────────────────────────────

builder.prismaObject('EtsAccount', {
  description: "An organization's EU ETS registry account",
  fields: (t) => ({
    id: t.exposeID('id'),
    organizationId: t.exposeString('organizationId'),
    accountNumber: t.exposeString('accountNumber', { nullable: true }),
    euaBalance: t.exposeFloat('euaBalance'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    records: t.relation('records'),
    transactions: t.relation('transactions'),
  }),
});

builder.prismaObject('EtsRecord', {
  description: 'Annual ETS CO₂ obligation for a vessel',
  fields: (t) => ({
    id: t.exposeID('id'),
    vesselId: t.exposeString('vesselId'),
    year: t.exposeInt('year'),
    totalCo2Mt: t.exposeFloat('totalCo2Mt'),
    applicablePct: t.exposeFloat('applicablePct'),
    obligationMt: t.exposeFloat('obligationMt'),
    euaSurrendered: t.exposeFloat('euaSurrendered'),
    surrenderDeadline: t.expose('surrenderDeadline', { type: 'DateTime', nullable: true }),
    isSettled: t.exposeBoolean('isSettled'),

    // Computed
    shortfallMt: t.field({
      type: 'Float',
      resolve: (r) => Math.max(0, r.obligationMt - r.euaSurrendered),
    }),
    settledPct: t.field({
      type: 'Float',
      resolve: (r) =>
        r.obligationMt > 0 ? Math.min(100, (r.euaSurrendered / r.obligationMt) * 100) : 0,
    }),

    vessel: t.relation('vessel'),
    account: t.relation('account'),
  }),
});

builder.prismaObject('EtsTransaction', {
  description: 'An EUA buy, sell, surrender, or transfer transaction',
  fields: (t) => ({
    id: t.exposeID('id'),
    accountId: t.exposeString('accountId'),
    type: t.exposeString('type'),
    euaAmount: t.exposeFloat('euaAmount'),
    priceEur: t.exposeFloat('priceEur', { nullable: true }),
    totalEur: t.exposeFloat('totalEur', { nullable: true }),
    notes: t.exposeString('notes', { nullable: true }),
    transactedAt: t.expose('transactedAt', { type: 'DateTime' }),
    account: t.relation('account'),
  }),
});

// ─────────────────────────────────────────────
// CUSTOM TYPES
// ─────────────────────────────────────────────

const CarbonPriceSnapshot = builder.objectRef<{
  euEtsEur: number;
  voluntaryVcsUsd: number;
  source: string;
  updatedAt: Date;
}>('CarbonPriceSnapshot');

CarbonPriceSnapshot.implement({
  fields: (t) => ({
    euEtsEur: t.exposeFloat('euEtsEur'),
    voluntaryVcsUsd: t.exposeFloat('voluntaryVcsUsd'),
    source: t.exposeString('source'),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
  }),
});

const CarbonPricePoint = builder.objectRef<{
  priceEur: number;
  priceUsd: number | null;
  source: string;
  recordedAt: Date;
}>('CarbonPricePoint');

CarbonPricePoint.implement({
  fields: (t) => ({
    priceEur: t.exposeFloat('priceEur'),
    priceUsd: t.exposeFloat('priceUsd', { nullable: true }),
    source: t.exposeString('source'),
    recordedAt: t.expose('recordedAt', { type: 'DateTime' }),
  }),
});

const FleetEtsDashboard = builder.objectRef<{
  year: number;
  totalVessels: number;
  totalCo2Mt: number;
  totalObligationMt: number;
  totalSurrenderedMt: number;
  totalShortfallMt: number;
  estimatedCostEur: number;
  euaBalance: number;
  euaPrice: number;
  surrenderDeadline: Date;
  daysUntilSurrender: number;
  settledVessels: number;
  phaseInPct: number;
}>('FleetEtsDashboard');

FleetEtsDashboard.implement({
  fields: (t) => ({
    year: t.exposeInt('year'),
    totalVessels: t.exposeInt('totalVessels'),
    totalCo2Mt: t.exposeFloat('totalCo2Mt'),
    totalObligationMt: t.exposeFloat('totalObligationMt'),
    totalSurrenderedMt: t.exposeFloat('totalSurrenderedMt'),
    totalShortfallMt: t.exposeFloat('totalShortfallMt'),
    estimatedCostEur: t.exposeFloat('estimatedCostEur'),
    euaBalance: t.exposeFloat('euaBalance'),
    euaPrice: t.exposeFloat('euaPrice'),
    surrenderDeadline: t.expose('surrenderDeadline', { type: 'DateTime' }),
    daysUntilSurrender: t.exposeInt('daysUntilSurrender'),
    settledVessels: t.exposeInt('settledVessels'),
    phaseInPct: t.exposeFloat('phaseInPct'),
  }),
});

const EtsCostForecast = builder.objectRef<{
  ytdObligationMt: number;
  projectedObligationMt: number;
  projectedCostEur: number;
  euaPrice: number;
}>('EtsCostForecast');

EtsCostForecast.implement({
  fields: (t) => ({
    ytdObligationMt: t.exposeFloat('ytdObligationMt'),
    projectedObligationMt: t.exposeFloat('projectedObligationMt'),
    projectedCostEur: t.exposeFloat('projectedCostEur'),
    euaPrice: t.exposeFloat('euaPrice'),
  }),
});

// ─────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────

builder.queryField('etsAccount', (t) =>
  t.prismaField({
    type: 'EtsAccount',
    nullable: true,
    description: "Fetch the organization's ETS account",
    resolve: (query, _root, _args, ctx) =>
      ctx.prisma.etsAccount.findFirst({
        ...query,
        where: ctx.orgFilter(),
      }),
  }),
);

builder.queryField('fleetEtsDashboard', (t) =>
  t.field({
    type: FleetEtsDashboard,
    description: 'Fleet-wide ETS obligations summary for the dashboard',
    args: { year: t.arg.int({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const [records, account, euaPrice] = await Promise.all([
        ctx.prisma.etsRecord.findMany({
          where: { year: args.year, vessel: ctx.orgFilter() },
        }),
        ctx.prisma.etsAccount.findFirst({ where: ctx.orgFilter() }),
        carbonPriceService.getLatestEuaPrice(ctx.prisma),
      ]);

      let totalCo2Mt = 0, totalObligationMt = 0, totalSurrenderedMt = 0;
      let settledVessels = 0;

      for (const r of records) {
        totalCo2Mt        += r.totalCo2Mt;
        totalObligationMt += r.obligationMt;
        totalSurrenderedMt += r.euaSurrendered;
        if (r.isSettled) settledVessels++;
      }

      const shortfall = Math.max(0, totalObligationMt - totalSurrenderedMt);
      const phaseInPct = ETS_PHASE_IN[args.year] ?? 1.00;

      return {
        year: args.year,
        totalVessels: records.length,
        totalCo2Mt,
        totalObligationMt,
        totalSurrenderedMt,
        totalShortfallMt: shortfall,
        estimatedCostEur: shortfall * euaPrice,
        euaBalance: account?.euaBalance ?? 0,
        euaPrice,
        surrenderDeadline: getSurrenderDeadline(args.year),
        daysUntilSurrender: daysUntilSurrender(args.year),
        settledVessels,
        phaseInPct,
      };
    },
  }),
);

builder.queryField('etsRecords', (t) =>
  t.prismaField({
    type: ['EtsRecord'],
    description: 'All ETS records for a given year across the fleet',
    args: { year: t.arg.int({ required: true }) },
    resolve: (query, _root, args, ctx) =>
      ctx.prisma.etsRecord.findMany({
        ...query,
        where: { year: args.year, vessel: ctx.orgFilter() },
        orderBy: { obligationMt: 'desc' },
      }),
  }),
);

builder.queryField('etsTransactions', (t) =>
  t.prismaField({
    type: ['EtsTransaction'],
    description: 'EUA transaction history for the account',
    args: { limit: t.arg.int() },
    resolve: (query, _root, args, ctx) =>
      ctx.prisma.etsTransaction.findMany({
        ...query,
        where: { account: ctx.orgFilter() },
        orderBy: { transactedAt: 'desc' },
        take: args.limit ?? 50,
      }),
  }),
);

builder.queryField('carbonPrices', (t) =>
  t.field({
    type: CarbonPriceSnapshot,
    description: 'Latest carbon prices (EUA + voluntary)',
    resolve: async (_root, _args, ctx) => {
      const [ets, vcs] = await Promise.all([
        ctx.prisma.carbonPriceFeed.findFirst({
          where: { type: 'eu_ets' },
          orderBy: { recordedAt: 'desc' },
        }),
        ctx.prisma.carbonPriceFeed.findFirst({
          where: { type: 'voluntary_vcs' },
          orderBy: { recordedAt: 'desc' },
        }),
      ]);

      return {
        euEtsEur: ets?.priceEur ?? 65.0,
        voluntaryVcsUsd: vcs?.priceUsd ?? 12.5,
        source: ets?.source ?? 'default',
        updatedAt: ets?.recordedAt ?? new Date(),
      };
    },
  }),
);

builder.queryField('euaPriceHistory', (t) =>
  t.field({
    type: [CarbonPricePoint],
    description: 'EUA price history for charting (last N days)',
    args: { days: t.arg.int() },
    resolve: async (_root, args, ctx) => {
      const history = await carbonPriceService.getPriceHistory(
        ctx.prisma,
        'eu_ets',
        args.days ?? 90,
      );
      return history;
    },
  }),
);

builder.queryField('etsCostForecast', (t) =>
  t.field({
    type: EtsCostForecast,
    description: 'Full-year ETS cost forecast based on YTD pace',
    args: { year: t.arg.int({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const records = await ctx.prisma.etsRecord.findMany({
        where: { year: args.year, vessel: ctx.orgFilter() },
        select: { obligationMt: true },
      });

      const euaPrice = await carbonPriceService.getLatestEuaPrice(ctx.prisma);
      const ytdObligationMt = records.reduce((s, r) => s + r.obligationMt, 0);

      const now = new Date();
      const dayOfYear = Math.floor(
        (now.getTime() - new Date(`${args.year}-01-01`).getTime()) / 86_400_000,
      );

      const { projectedObligationMt, projectedCostEur } = forecastFullYearEtsCost(
        ytdObligationMt,
        dayOfYear,
        euaPrice,
      );

      return { ytdObligationMt, projectedObligationMt, projectedCostEur, euaPrice };
    },
  }),
);

builder.queryField('classifyVoyageScope', (t) =>
  t.field({
    type: 'String',
    description: 'Classify the EU ETS scope for a voyage given port country codes',
    args: {
      departureCc: t.arg.string({ required: true }),
      arrivalCc: t.arg.string({ required: true }),
    },
    resolve: (_root, args) => classifyEtsScope(args.departureCc, args.arrivalCc),
  }),
);

// ─────────────────────────────────────────────
// MUTATIONS
// ─────────────────────────────────────────────

builder.mutationField('createEtsAccount', (t) =>
  t.prismaField({
    type: 'EtsAccount',
    description: 'Create an ETS account for the organization',
    args: { accountNumber: t.arg.string() },
    resolve: (query, _root, args, ctx) =>
      ctx.prisma.etsAccount.create({
        ...query,
        data: {
          organizationId: ctx.orgId(),
          accountNumber: args.accountNumber ?? undefined,
          euaBalance: 0,
        },
      }),
  }),
);

builder.mutationField('calculateEtsRecord', (t) =>
  t.prismaField({
    type: 'EtsRecord',
    nullable: true,
    description: 'Trigger ETS obligation calculation for a vessel/year from voyage data',
    args: {
      vesselId: t.arg.string({ required: true }),
      year: t.arg.int({ required: true }),
    },
    resolve: async (query, _root, args, ctx) => {
      await etsService.calculateAndPersist(args.vesselId, args.year, ctx.prisma);
      return ctx.prisma.etsRecord.findUnique({
        ...query,
        where: { vesselId_year: { vesselId: args.vesselId, year: args.year } },
      });
    },
  }),
);

builder.mutationField('buyEtsAllowances', (t) =>
  t.prismaField({
    type: 'EtsAccount',
    description: 'Record a purchase of EUA allowances',
    args: {
      accountId: t.arg.string({ required: true }),
      euaAmount: t.arg.float({ required: true }),
      priceEur: t.arg.float({ required: true }),
    },
    resolve: async (query, _root, args, ctx) => {
      const totalEur = args.euaAmount * args.priceEur;

      await ctx.prisma.$transaction([
        ctx.prisma.etsTransaction.create({
          data: {
            accountId: args.accountId,
            type: 'buy',
            euaAmount: args.euaAmount,
            priceEur: args.priceEur,
            totalEur,
            transactedAt: new Date(),
          },
        }),
        ctx.prisma.etsAccount.update({
          where: { id: args.accountId },
          data: { euaBalance: { increment: args.euaAmount } },
        }),
      ]);

      return ctx.prisma.etsAccount.findUniqueOrThrow({
        ...query,
        where: { id: args.accountId },
      });
    },
  }),
);

builder.mutationField('surrenderEtsAllowances', (t) =>
  t.prismaField({
    type: 'EtsRecord',
    description: 'Surrender EUAs against a vessel annual obligation (30 April deadline)',
    args: {
      vesselId: t.arg.string({ required: true }),
      year: t.arg.int({ required: true }),
      euaAmount: t.arg.float({ required: true }),
      accountId: t.arg.string({ required: true }),
    },
    resolve: async (query, _root, args, ctx) => {
      await etsService.recordSurrender(
        args.vesselId,
        args.year,
        args.euaAmount,
        args.accountId,
        ctx.prisma,
      );
      return ctx.prisma.etsRecord.findUniqueOrThrow({
        ...query,
        where: { vesselId_year: { vesselId: args.vesselId, year: args.year } },
      });
    },
  }),
);

builder.mutationField('setManualCarbonPrice', (t) =>
  t.field({
    type: 'Boolean',
    description: 'Manually set the EUA price (admin use)',
    args: {
      priceEur: t.arg.float({ required: true }),
      type: t.arg.string(),
    },
    resolve: async (_root, args, ctx) => {
      await carbonPriceService.setManualPrice(
        ctx.prisma,
        (args.type as 'eu_ets' | 'voluntary_vcs') ?? 'eu_ets',
        args.priceEur,
      );
      return true;
    },
  }),
);

builder.mutationField('calculateFleetEts', (t) =>
  t.field({
    type: 'JSON',
    description: 'Recalculate ETS obligations for all fleet vessels',
    args: { year: t.arg.int({ required: true }) },
    resolve: async (_root, args, ctx) =>
      etsService.calculateFleetEts(ctx.orgId(), args.year, ctx.prisma),
  }),
);
