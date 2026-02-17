/**
 * FuelEU Maritime GraphQL Schema
 * Regulation (EU) 2023/1805 — effective 1 January 2025
 */

import { builder } from '../builder.js';
import {
  calculateAndPersist,
  calculateFleetFuelEu,
  getFleetFuelEuDashboard,
  recordPooling,
} from '../../services/fueleu/fueleu-service.js';
import {
  getTargetGhgIntensity,
  FUELEU_BASELINE_GGHG,
  FUEL_WTW_GHG,
  FUEL_LHV_MJ_PER_TONNE,
  calculateGhgIntensity,
  type FuelConsumption,
} from '../../services/fueleu/fueleu-calculator.js';

// ─────────────────────────────────────────────
// PRISMA OBJECT
// ─────────────────────────────────────────────

builder.prismaObject('FuelEuRecord', {
  description: 'Annual FuelEU Maritime compliance record for a vessel',
  fields: (t) => ({
    id: t.exposeID('id'),
    vesselId: t.exposeString('vesselId'),
    year: t.exposeInt('year'),
    actualGhgIntensity: t.exposeFloat('actualGhgIntensity', { nullable: true }),
    targetGhgIntensity: t.exposeFloat('targetGhgIntensity', { nullable: true }),
    ghgGap: t.exposeFloat('ghgGap', { nullable: true }),
    totalEnergyMj: t.exposeFloat('totalEnergyMj'),
    isCompliant: t.exposeBoolean('isCompliant'),
    penaltyEur: t.exposeFloat('penaltyEur'),
    poolSurplusMj: t.exposeFloat('poolSurplusMj'),
    poolBorrowedMj: t.exposeFloat('poolBorrowedMj'),

    // Computed
    compliancePct: t.field({
      type: 'Float',
      description: 'Percentage of target achieved (100 = exactly on target)',
      resolve: (r) => {
        if (!r.actualGhgIntensity || !r.targetGhgIntensity) return 0;
        return Math.min(150, (r.targetGhgIntensity / r.actualGhgIntensity) * 100);
      },
    }),

    vessel: t.relation('vessel'),
  }),
});

// ─────────────────────────────────────────────
// CUSTOM TYPES
// ─────────────────────────────────────────────

const FleetFuelEuDashboard = builder.objectRef<{
  year: number;
  totalVessels: number;
  compliantVessels: number;
  nonCompliantVessels: number;
  fleetAvgGhgIntensity: number;
  targetGhgIntensity: number;
  fleetGhgGap: number;
  totalEnergyMj: number;
  totalPenaltyEur: number;
  totalPoolSurplusMj: number;
  totalPoolBorrowedMj: number;
}>('FleetFuelEuDashboard');

FleetFuelEuDashboard.implement({
  fields: (t) => ({
    year: t.exposeInt('year'),
    totalVessels: t.exposeInt('totalVessels'),
    compliantVessels: t.exposeInt('compliantVessels'),
    nonCompliantVessels: t.exposeInt('nonCompliantVessels'),
    fleetAvgGhgIntensity: t.exposeFloat('fleetAvgGhgIntensity'),
    targetGhgIntensity: t.exposeFloat('targetGhgIntensity'),
    fleetGhgGap: t.exposeFloat('fleetGhgGap'),
    totalEnergyMj: t.exposeFloat('totalEnergyMj'),
    totalPenaltyEur: t.exposeFloat('totalPenaltyEur'),
    totalPoolSurplusMj: t.exposeFloat('totalPoolSurplusMj'),
    totalPoolBorrowedMj: t.exposeFloat('totalPoolBorrowedMj'),
  }),
});

const FuelGhgSimResult = builder.objectRef<{
  fuelType: string;
  ghgFactor: number;
  lhvMjPerTonne: number;
  energyMj: number;
  ghgIntensityContrib: number;
}>('FuelGhgSimResult');

FuelGhgSimResult.implement({
  fields: (t) => ({
    fuelType: t.exposeString('fuelType'),
    ghgFactor: t.exposeFloat('ghgFactor'),
    lhvMjPerTonne: t.exposeFloat('lhvMjPerTonne'),
    energyMj: t.exposeFloat('energyMj'),
    ghgIntensityContrib: t.exposeFloat('ghgIntensityContrib'),
  }),
});

const FuelEuSimulation = builder.objectRef<{
  actualGhgIntensity: number;
  targetGhgIntensity: number;
  ghgGap: number;
  isCompliant: boolean;
  penaltyEur: number;
  totalEnergyMj: number;
  breakdown: Array<{ fuelType: string; ghgFactor: number; lhvMjPerTonne: number; energyMj: number; ghgIntensityContrib: number }>;
}>('FuelEuSimulation');

FuelEuSimulation.implement({
  fields: (t) => ({
    actualGhgIntensity: t.exposeFloat('actualGhgIntensity'),
    targetGhgIntensity: t.exposeFloat('targetGhgIntensity'),
    ghgGap: t.exposeFloat('ghgGap'),
    isCompliant: t.exposeBoolean('isCompliant'),
    penaltyEur: t.exposeFloat('penaltyEur'),
    totalEnergyMj: t.exposeFloat('totalEnergyMj'),
    breakdown: t.field({
      type: [FuelGhgSimResult],
      resolve: (r) => r.breakdown,
    }),
  }),
});

const FuelEuTarget = builder.objectRef<{
  year: number;
  targetGhgIntensity: number;
  reductionPct: number;
  baseline: number;
}>('FuelEuTarget');

FuelEuTarget.implement({
  fields: (t) => ({
    year: t.exposeInt('year'),
    targetGhgIntensity: t.exposeFloat('targetGhgIntensity'),
    reductionPct: t.exposeFloat('reductionPct'),
    baseline: t.exposeFloat('baseline'),
  }),
});

// ─────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────

builder.queryField('fleetFuelEuDashboard', (t) =>
  t.field({
    type: FleetFuelEuDashboard,
    args: { year: t.arg.int({ required: true }) },
    resolve: async (_, { year }, ctx) => {
      const result = await getFleetFuelEuDashboard(ctx.orgId(), year);
      return result;
    },
  }),
);

builder.queryField('fuelEuRecords', (t) =>
  t.prismaField({
    type: ['FuelEuRecord'],
    args: { year: t.arg.int({ required: true }) },
    resolve: (query, _, { year }, ctx) =>
      ctx.prisma.fuelEuRecord.findMany({
        ...query,
        where: { year, vessel: ctx.orgFilter() },
        orderBy: [{ ghgGap: 'desc' }], // worst compliance first
      }),
  }),
);

builder.queryField('fuelEuRecord', (t) =>
  t.prismaField({
    type: 'FuelEuRecord',
    nullable: true,
    args: {
      vesselId: t.arg.string({ required: true }),
      year: t.arg.int({ required: true }),
    },
    resolve: (query, _, { vesselId, year }, ctx) =>
      ctx.prisma.fuelEuRecord.findUnique({
        ...query,
        where: { vesselId_year: { vesselId, year } },
      }),
  }),
);

// GHG target schedule
builder.queryField('fuelEuTargets', (t) =>
  t.field({
    type: [FuelEuTarget],
    description: 'FuelEU GHG intensity reduction targets by year',
    resolve: () => {
      const years = [2025, 2030, 2035, 2040, 2045, 2050];
      return years.map((year) => {
        const target = getTargetGhgIntensity(year);
        const reductionPct = ((FUELEU_BASELINE_GGHG - target) / FUELEU_BASELINE_GGHG) * 100;
        return { year, targetGhgIntensity: target, reductionPct, baseline: FUELEU_BASELINE_GGHG };
      });
    },
  }),
);

// Fuel mix GHG simulator — what-if tool
builder.queryField('simulateFuelMix', (t) =>
  t.field({
    type: FuelEuSimulation,
    description: 'Simulate GHG intensity for a custom fuel mix',
    args: {
      year: t.arg.int({ required: true }),
      hfoMt:           t.arg.float({ defaultValue: 0 }),
      mgoMt:           t.arg.float({ defaultValue: 0 }),
      lngMt:           t.arg.float({ defaultValue: 0 }),
      methanolMt:      t.arg.float({ defaultValue: 0 }),
      methanolBioMt:   t.arg.float({ defaultValue: 0 }),
      biofuelMt:       t.arg.float({ defaultValue: 0 }),
      bioLngMt:        t.arg.float({ defaultValue: 0 }),
      ammoniaGreenMt:  t.arg.float({ defaultValue: 0 }),
      h2GreenMt:       t.arg.float({ defaultValue: 0 }),
    },
    resolve: (_, args) => {
      const consumption: FuelConsumption = {
        hfoMt:           args.hfoMt ?? 0,
        mgoMt:           args.mgoMt ?? 0,
        lngMt:           args.lngMt ?? 0,
        methanolMt:      args.methanolMt ?? 0,
        methanolBioMt:   args.methanolBioMt ?? 0,
        biofuelMt:       args.biofuelMt ?? 0,
        bioLngMt:        args.bioLngMt ?? 0,
        ammoniaGreenMt:  args.ammoniaGreenMt ?? 0,
        h2GreenMt:       args.h2GreenMt ?? 0,
      };

      const { totalEnergyMj, actualGhgIntensity, contributions } = calculateGhgIntensity(consumption);
      const targetGhgIntensity = getTargetGhgIntensity(args.year);
      const ghgGap = actualGhgIntensity - targetGhgIntensity;
      const isCompliant = ghgGap <= 0;

      const penaltyEur = isCompliant ? 0 :
        (ghgGap * totalEnergyMj) / (FUELEU_BASELINE_GGHG * 40_200) * 2_400;

      return {
        actualGhgIntensity,
        targetGhgIntensity,
        ghgGap,
        isCompliant,
        penaltyEur,
        totalEnergyMj,
        breakdown: contributions.map((c) => ({
          fuelType: c.fuelType,
          ghgFactor: c.ghgFactor,
          lhvMjPerTonne: FUEL_LHV_MJ_PER_TONNE[c.fuelType] ?? 40_200,
          energyMj: c.energyMj,
          ghgIntensityContrib: totalEnergyMj > 0 ? (c.ghgContributionGco2eq / totalEnergyMj) : 0,
        })),
      };
    },
  }),
);

// ─────────────────────────────────────────────
// MUTATIONS
// ─────────────────────────────────────────────

builder.mutationField('calculateFuelEuRecord', (t) =>
  t.prismaField({
    type: 'FuelEuRecord',
    args: {
      vesselId: t.arg.string({ required: true }),
      year: t.arg.int({ required: true }),
    },
    resolve: async (query, _, { vesselId, year }, ctx) => {
      await calculateAndPersist(vesselId, year, ctx.orgId());
      return ctx.prisma.fuelEuRecord.findUniqueOrThrow({
        ...query,
        where: { vesselId_year: { vesselId, year } },
      });
    },
  }),
);

builder.mutationField('calculateFleetFuelEu', (t) =>
  t.field({
    type: 'String',
    args: { year: t.arg.int({ required: true }) },
    resolve: async (_, { year }, ctx) => {
      const result = await calculateFleetFuelEu(ctx.orgId(), year);
      return `Processed ${result.processed} vessels — ${result.compliant} compliant — total penalty €${result.totalPenaltyEur.toFixed(0)}`;
    },
  }),
);

builder.mutationField('recordFuelEuPooling', (t) =>
  t.field({
    type: 'String',
    args: {
      vesselId: t.arg.string({ required: true }),
      year: t.arg.int({ required: true }),
      poolMj: t.arg.float({ required: true }),
    },
    resolve: async (_, { vesselId, year, poolMj }) => {
      await recordPooling(vesselId, year, poolMj);
      return `Pool transaction recorded: ${poolMj > 0 ? '+' : ''}${poolMj.toFixed(0)} MJ for vessel ${vesselId} (${year})`;
    },
  }),
);
