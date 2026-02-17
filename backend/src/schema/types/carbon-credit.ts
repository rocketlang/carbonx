/**
 * Carbon Credits GraphQL Schema — Phase 6
 * Voluntary Carbon Market (VCM) portfolio management
 */

import { builder } from '../builder.js';
import {
  getPortfolio,
  purchaseCredits,
  retireCredits,
  listForSale,
  getNetOffsetPosition,
  CREDIT_STANDARDS,
} from '../../services/credits/credits-service.js';

// ─────────────────────────────────────────────
// PRISMA OBJECT
// ─────────────────────────────────────────────

builder.prismaObject('CarbonCredit', {
  description: 'A voluntary carbon credit (tCO₂e) in the portfolio',
  fields: (t) => ({
    id: t.exposeID('id'),
    organizationId: t.exposeString('organizationId'),
    standard: t.exposeString('standard'),
    projectId: t.exposeString('projectId'),
    projectName: t.exposeString('projectName'),
    projectType: t.exposeString('projectType'),
    country: t.exposeString('country'),
    vintage: t.exposeInt('vintage'),
    quantity: t.exposeFloat('quantity'),
    priceUsd: t.exposeFloat('priceUsd', { nullable: true }),
    status: t.exposeString('status'),
    retiredAt: t.expose('retiredAt', { type: 'DateTime', nullable: true }),
    retiredFor: t.exposeString('retiredFor', { nullable: true }),
    registryUrl: t.exposeString('registryUrl', { nullable: true }),
    serialNumber: t.exposeString('serialNumber', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),

    // Computed
    totalValueUsd: t.field({
      type: 'Float',
      nullable: true,
      resolve: (c) => c.priceUsd != null ? c.priceUsd * c.quantity : null,
    }),
    organization: t.relation('organization'),
  }),
});

// ─────────────────────────────────────────────
// CUSTOM TYPES
// ─────────────────────────────────────────────

const StandardBreakdown = builder.objectRef<{
  standard: string; quantity: number;
}>('StandardBreakdown');
StandardBreakdown.implement({
  fields: (t) => ({
    standard: t.exposeString('standard'),
    quantity: t.exposeFloat('quantity'),
  }),
});

const VintageBreakdown = builder.objectRef<{
  vintage: number; quantity: number;
}>('VintageBreakdown');
VintageBreakdown.implement({
  fields: (t) => ({
    vintage: t.exposeInt('vintage'),
    quantity: t.exposeFloat('quantity'),
  }),
});

const TypeBreakdown = builder.objectRef<{
  projectType: string; quantity: number;
}>('TypeBreakdown');
TypeBreakdown.implement({
  fields: (t) => ({
    projectType: t.exposeString('projectType'),
    quantity: t.exposeFloat('quantity'),
  }),
});

const CreditPortfolio = builder.objectRef<{
  totalActive: number;
  totalRetired: number;
  totalForSale: number;
  avgPriceUsd: number;
  portfolioValueUsd: number;
  byStandard: Array<{ standard: string; quantity: number }>;
  byVintage: Array<{ vintage: number; quantity: number }>;
  byType: Array<{ projectType: string; quantity: number }>;
}>('CreditPortfolio');

CreditPortfolio.implement({
  fields: (t) => ({
    totalActive: t.exposeFloat('totalActive'),
    totalRetired: t.exposeFloat('totalRetired'),
    totalForSale: t.exposeFloat('totalForSale'),
    avgPriceUsd: t.exposeFloat('avgPriceUsd'),
    portfolioValueUsd: t.exposeFloat('portfolioValueUsd'),
    byStandard: t.field({
      type: [StandardBreakdown],
      resolve: (p) => p.byStandard,
    }),
    byVintage: t.field({
      type: [VintageBreakdown],
      resolve: (p) => p.byVintage,
    }),
    byType: t.field({
      type: [TypeBreakdown],
      resolve: (p) => p.byType,
    }),
  }),
});

const StandardInfo = builder.objectRef<{
  key: string;
  name: string;
  shortName: string;
  registry: string;
  quality: string;
}>('StandardInfo');
StandardInfo.implement({
  fields: (t) => ({
    key: t.exposeString('key'),
    name: t.exposeString('name'),
    shortName: t.exposeString('shortName'),
    registry: t.exposeString('registry'),
    quality: t.exposeString('quality'),
  }),
});

const NetOffsetPosition = builder.objectRef<{
  totalCreditsAvail: number;
  etsShortfallMt: number;
  fuelEuPenaltyEur: number;
  atRiskCiiVessels: number;
  coverageRatio: number | null;
  netPosition: number;
}>('NetOffsetPosition');
NetOffsetPosition.implement({
  fields: (t) => ({
    totalCreditsAvail: t.exposeFloat('totalCreditsAvail'),
    etsShortfallMt: t.exposeFloat('etsShortfallMt'),
    fuelEuPenaltyEur: t.exposeFloat('fuelEuPenaltyEur'),
    atRiskCiiVessels: t.exposeInt('atRiskCiiVessels'),
    coverageRatio: t.exposeFloat('coverageRatio', { nullable: true }),
    netPosition: t.exposeFloat('netPosition'),
  }),
});

const RetireResult = builder.objectRef<{
  retired: number; retiredFor: string;
}>('RetireResult');
RetireResult.implement({
  fields: (t) => ({
    retired: t.exposeFloat('retired'),
    retiredFor: t.exposeString('retiredFor'),
  }),
});

// ─────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────

builder.queryField('creditPortfolio', (t) =>
  t.field({
    type: CreditPortfolio,
    description: 'Aggregated portfolio analytics for the organization',
    resolve: (_, __, ctx) => getPortfolio(ctx.orgId()),
  }),
);

builder.queryField('carbonCredits', (t) =>
  t.prismaField({
    type: ['CarbonCredit'],
    args: {
      status:      t.arg.string(),
      standard:    t.arg.string(),
      projectType: t.arg.string(),
      vintage:     t.arg.int(),
    },
    resolve: (query, _, args, ctx) =>
      ctx.prisma.carbonCredit.findMany({
        ...query,
        where: {
          organizationId: ctx.orgId(),
          ...(args.status      ? { status: args.status }           : {}),
          ...(args.standard    ? { standard: args.standard }       : {}),
          ...(args.projectType ? { projectType: args.projectType } : {}),
          ...(args.vintage     ? { vintage: args.vintage }         : {}),
        },
        orderBy: [{ vintage: 'desc' }, { createdAt: 'desc' }],
      }),
  }),
);

builder.queryField('creditStandards', (t) =>
  t.field({
    type: [StandardInfo],
    description: 'Supported carbon credit standards with registry info',
    resolve: () =>
      Object.entries(CREDIT_STANDARDS).map(([key, s]) => ({
        key,
        name: s.name,
        shortName: s.shortName,
        registry: s.registry,
        quality: s.quality,
      })),
  }),
);

builder.queryField('netOffsetPosition', (t) =>
  t.field({
    type: NetOffsetPosition,
    description: 'Net offset position vs ETS + FuelEU + CII obligations',
    args: { year: t.arg.int({ required: true }) },
    resolve: (_, { year }, ctx) => getNetOffsetPosition(ctx.orgId(), year),
  }),
);

// ─────────────────────────────────────────────
// MUTATIONS
// ─────────────────────────────────────────────

builder.mutationField('purchaseCarbonCredits', (t) =>
  t.prismaField({
    type: 'CarbonCredit',
    description: 'Add purchased carbon credits to portfolio',
    args: {
      standard:    t.arg.string({ required: true }),
      projectId:   t.arg.string({ required: true }),
      projectName: t.arg.string({ required: true }),
      projectType: t.arg.string({ required: true }),
      country:     t.arg.string({ required: true }),
      vintage:     t.arg.int({ required: true }),
      quantity:    t.arg.float({ required: true }),
      priceUsd:    t.arg.float(),
      registryUrl: t.arg.string(),
      serialNumber:t.arg.string(),
    },
    resolve: async (query, _, args, ctx) => {
      await purchaseCredits({
        organizationId: ctx.orgId(),
        standard:    args.standard,
        projectId:   args.projectId,
        projectName: args.projectName,
        projectType: args.projectType,
        country:     args.country,
        vintage:     args.vintage,
        quantity:    args.quantity,
        priceUsd:    args.priceUsd ?? undefined,
        registryUrl: args.registryUrl ?? undefined,
        serialNumber:args.serialNumber ?? undefined,
      });
      return ctx.prisma.carbonCredit.findFirstOrThrow({
        ...query,
        where: {
          organizationId: ctx.orgId(),
          projectId: args.projectId,
          standard:  args.standard,
        },
        orderBy: { createdAt: 'desc' },
      });
    },
  }),
);

builder.mutationField('retireCarbonCredits', (t) =>
  t.field({
    type: RetireResult,
    description: 'Permanently retire credits for an offset claim',
    args: {
      creditId:    t.arg.string({ required: true }),
      quantity:    t.arg.float({ required: true }),
      retiredFor:  t.arg.string({ required: true }),  // e.g. "Voyage IMO 2024 Scope 1"
    },
    resolve: (_, args, ctx) =>
      retireCredits(args.creditId, args.quantity, args.retiredFor, ctx.orgId()),
  }),
);

builder.mutationField('listCreditsForSale', (t) =>
  t.prismaField({
    type: 'CarbonCredit',
    description: 'Mark credits as available for sale on the marketplace',
    args: { creditId: t.arg.string({ required: true }) },
    resolve: async (query, _, { creditId }, ctx) => {
      await listForSale(creditId, ctx.orgId());
      return ctx.prisma.carbonCredit.findUniqueOrThrow({ ...query, where: { id: creditId } });
    },
  }),
);
