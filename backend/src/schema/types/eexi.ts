/**
 * EEXI GraphQL Schema
 * IMO MARPOL Annex VI — Resolution MEPC.333(76)
 * Mandatory from 1 November 2022
 */

import { builder } from '../builder.js';
import {
  calculateAndPersist,
  getFleetEexiStatus,
  updateCertification,
} from '../../services/eexi/eexi-service.js';
import {
  calculateEexiCompliance,
  calculateRequiredEexi,
  getEexiCapacity,
  calculateEpl,
  EEXI_REFERENCE_PARAMS,
  EEXI_CF,
  EEXI_SFC_DEFAULTS,
  type EexiInput,
} from '../../services/eexi/eexi-calculator.js';

// ─────────────────────────────────────────────
// PRISMA OBJECT
// ─────────────────────────────────────────────

builder.prismaObject('EexiRecord', {
  description: 'EEXI certification record for a vessel (one-time)',
  fields: (t) => ({
    id: t.exposeID('id'),
    vesselId: t.exposeString('vesselId'),
    attainedEexi: t.exposeFloat('attainedEexi', { nullable: true }),
    requiredEexi: t.exposeFloat('requiredEexi', { nullable: true }),
    isCompliant: t.exposeBoolean('isCompliant'),
    enginePowerLimitKw: t.exposeFloat('enginePowerLimitKw', { nullable: true }),
    shaPowerLimitKw: t.exposeFloat('shaPowerLimitKw', { nullable: true }),
    certificateNumber: t.exposeString('certificateNumber', { nullable: true }),
    certifiedAt: t.expose('certifiedAt', { type: 'DateTime', nullable: true }),
    certifiedBy: t.exposeString('certifiedBy', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),

    // Computed
    eexiRatio: t.field({
      type: 'Float',
      nullable: true,
      description: 'attainedEexi / requiredEexi — < 1.0 = compliant',
      resolve: (r) =>
        r.attainedEexi != null && r.requiredEexi != null && r.requiredEexi > 0
          ? r.attainedEexi / r.requiredEexi
          : null,
    }),
    eplPct: t.field({
      type: 'Float',
      nullable: true,
      description: 'Engine Power Limitation as % of MCR needed for compliance',
      resolve: (r) => {
        if (!r.attainedEexi || !r.requiredEexi) return null;
        if (r.isCompliant) return null;
        return (r.requiredEexi / r.attainedEexi) * 100;
      },
    }),

    vessel: t.relation('vessel'),
  }),
});

// ─────────────────────────────────────────────
// CUSTOM TYPES
// ─────────────────────────────────────────────

const FleetEexiStatus = builder.objectRef<{
  totalVessels: number;
  certifiedVessels: number;
  compliantVessels: number;
  nonCompliantVessels: number;
  pendingCertification: number;
}>('FleetEexiStatus');

FleetEexiStatus.implement({
  fields: (t) => ({
    totalVessels: t.exposeInt('totalVessels'),
    certifiedVessels: t.exposeInt('certifiedVessels'),
    compliantVessels: t.exposeInt('compliantVessels'),
    nonCompliantVessels: t.exposeInt('nonCompliantVessels'),
    pendingCertification: t.exposeInt('pendingCertification'),
  }),
});

const EexiSimResult = builder.objectRef<{
  attainedEexi: number;
  requiredEexi: number;
  eexiGap: number;
  isCompliant: boolean;
  eplFraction: number;
  speedPenaltyPct: number;
  pMe75Kw: number;
  capacity: number;
  reductionPct: number;
}>('EexiSimResult');

EexiSimResult.implement({
  fields: (t) => ({
    attainedEexi: t.exposeFloat('attainedEexi'),
    requiredEexi: t.exposeFloat('requiredEexi'),
    eexiGap: t.exposeFloat('eexiGap'),
    isCompliant: t.exposeBoolean('isCompliant'),
    eplFraction: t.exposeFloat('eplFraction'),
    speedPenaltyPct: t.exposeFloat('speedPenaltyPct'),
    pMe75Kw: t.exposeFloat('pMe75Kw'),
    capacity: t.exposeFloat('capacity'),
    reductionPct: t.exposeFloat('reductionPct'),
  }),
});

const EexiVesselStatus = builder.objectRef<{
  vesselId: string;
  vesselName: string;
  imo: string;
  vesselType: string;
  dwt: number;
  gt: number;
  attainedEexi: number | null;
  requiredEexi: number | null;
  isCompliant: boolean;
  eexiRatio: number | null;
  eplPct: number | null;
  certificateNumber: string | null;
  certifiedAt: Date | null;
  certifiedBy: string | null;
  enginePowerLimitKw: number | null;
}>('EexiVesselStatus');

EexiVesselStatus.implement({
  fields: (t) => ({
    vesselId: t.exposeString('vesselId'),
    vesselName: t.exposeString('vesselName'),
    imo: t.exposeString('imo'),
    vesselType: t.exposeString('vesselType'),
    dwt: t.exposeFloat('dwt'),
    gt: t.exposeFloat('gt'),
    attainedEexi: t.exposeFloat('attainedEexi', { nullable: true }),
    requiredEexi: t.exposeFloat('requiredEexi', { nullable: true }),
    isCompliant: t.exposeBoolean('isCompliant'),
    eexiRatio: t.exposeFloat('eexiRatio', { nullable: true }),
    eplPct: t.exposeFloat('eplPct', { nullable: true }),
    certificateNumber: t.exposeString('certificateNumber', { nullable: true }),
    certifiedAt: t.expose('certifiedAt', { type: 'DateTime', nullable: true }),
    certifiedBy: t.exposeString('certifiedBy', { nullable: true }),
    enginePowerLimitKw: t.exposeFloat('enginePowerLimitKw', { nullable: true }),
  }),
});

// ─────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────

builder.queryField('fleetEexiStatus', (t) =>
  t.field({
    type: FleetEexiStatus,
    description: 'Fleet-wide EEXI certification status',
    resolve: async (_, __, ctx) => {
      const status = await getFleetEexiStatus(ctx.orgId());
      return {
        totalVessels: status.totalVessels,
        certifiedVessels: status.certifiedVessels,
        compliantVessels: status.compliantVessels,
        nonCompliantVessels: status.nonCompliantVessels,
        pendingCertification: status.pendingCertification,
      };
    },
  }),
);

builder.queryField('fleetEexiVessels', (t) =>
  t.field({
    type: [EexiVesselStatus],
    description: 'Per-vessel EEXI status with EPL details',
    resolve: async (_, __, ctx) => {
      const status = await getFleetEexiStatus(ctx.orgId());
      return status.vessels.map(({ vessel, eexiRecord: r }) => {
        const eexiRatio =
          r?.attainedEexi != null && r.requiredEexi != null && r.requiredEexi > 0
            ? r.attainedEexi / r.requiredEexi
            : null;
        const eplPct =
          r && !r.isCompliant && r.attainedEexi && r.requiredEexi
            ? (r.requiredEexi / r.attainedEexi) * 100
            : null;
        return {
          vesselId: vessel.id,
          vesselName: vessel.name,
          imo: vessel.imo,
          vesselType: vessel.type,
          dwt: vessel.dwt,
          gt: vessel.gt,
          attainedEexi: r?.attainedEexi ?? null,
          requiredEexi: r?.requiredEexi ?? null,
          isCompliant: r?.isCompliant ?? false,
          eexiRatio,
          eplPct,
          certificateNumber: r?.certificateNumber ?? null,
          certifiedAt: r?.certifiedAt ?? null,
          certifiedBy: r?.certifiedBy ?? null,
          enginePowerLimitKw: r?.enginePowerLimitKw ?? null,
        };
      });
    },
  }),
);

builder.queryField('eexiRecord', (t) =>
  t.prismaField({
    type: 'EexiRecord',
    nullable: true,
    args: { vesselId: t.arg.string({ required: true }) },
    resolve: (query, _, { vesselId }) =>
      prisma.eexiRecord.findUnique({ ...query, where: { vesselId } }),
  }),
);

// EEXI simulator — what-if without saving
builder.queryField('simulateEexi', (t) =>
  t.field({
    type: EexiSimResult,
    description: 'Simulate EEXI for any vessel parameters (does not save)',
    args: {
      vesselType:   t.arg.string({ required: true }),
      dwt:          t.arg.float({ required: true }),
      gt:           t.arg.float({ required: true }),
      mcrKw:        t.arg.float({ required: true }),
      designSpeedKn:t.arg.float({ required: true }),
      fuelType:     t.arg.string({ defaultValue: 'hfo' }),
      sfcGkWh:      t.arg.float(),
      fwFactor:     t.arg.float({ defaultValue: 1.0 }),
      eplFraction:  t.arg.float({ defaultValue: 1.0 }),
    },
    resolve: (_, args) => {
      const input: EexiInput = {
        vesselType:    args.vesselType,
        dwt:           args.dwt,
        gt:            args.gt,
        mcrKw:         args.mcrKw,
        designSpeedKn: args.designSpeedKn,
        fuelType:      args.fuelType ?? 'hfo',
        sfcGkWh:       args.sfcGkWh ?? undefined,
        fwFactor:      args.fwFactor ?? 1.0,
        eplFraction:   args.eplFraction ?? 1.0,
      };
      return calculateEexiCompliance(input);
    },
  }),
);

// ─────────────────────────────────────────────
// MUTATIONS
// ─────────────────────────────────────────────

builder.mutationField('calculateEexiRecord', (t) =>
  t.field({
    type: EexiSimResult,
    description: 'Calculate + save EEXI for a vessel',
    args: {
      vesselId:      t.arg.string({ required: true }),
      mcrKw:         t.arg.float({ required: true }),
      designSpeedKn: t.arg.float({ required: true }),
      fuelType:      t.arg.string({ defaultValue: 'hfo' }),
      sfcGkWh:       t.arg.float(),
      fwFactor:      t.arg.float({ defaultValue: 1.0 }),
      eplFraction:   t.arg.float({ defaultValue: 1.0 }),
      certificateNumber: t.arg.string(),
      certifiedBy:       t.arg.string(),
      certifiedAt:       t.arg({ type: 'DateTime' }),
    },
    resolve: async (_, args) => {
      const result = await calculateAndPersist(
        args.vesselId,
        {
          mcrKw: args.mcrKw,
          designSpeedKn: args.designSpeedKn,
          fuelType: args.fuelType ?? 'hfo',
          sfcGkWh: args.sfcGkWh ?? undefined,
          fwFactor: args.fwFactor ?? 1.0,
          eplFraction: args.eplFraction ?? 1.0,
        },
        {
          certificateNumber: args.certificateNumber ?? undefined,
          certifiedBy: args.certifiedBy ?? undefined,
          certifiedAt: args.certifiedAt ?? undefined,
        },
      );

      // Fetch vessel for reductionPct
      const vessel = await prisma.vessel.findUniqueOrThrow({
        where: { id: args.vesselId },
        select: { type: true, dwt: true, gt: true },
      });
      const capacity = getEexiCapacity(vessel);
      const params = EEXI_REFERENCE_PARAMS[vessel.type] ?? EEXI_REFERENCE_PARAMS.bulker;

      return {
        attainedEexi: result.attainedEexi,
        requiredEexi: result.requiredEexi,
        eexiGap: result.attainedEexi - result.requiredEexi,
        isCompliant: result.isCompliant,
        eplFraction: result.eplFraction,
        speedPenaltyPct: result.speedPenaltyPct,
        pMe75Kw: 0.75 * args.mcrKw * (args.eplFraction ?? 1.0),
        capacity,
        reductionPct: params.reductionPct,
      };
    },
  }),
);

builder.mutationField('updateEexiCertificate', (t) =>
  t.prismaField({
    type: 'EexiRecord',
    description: 'Update EEXI certificate details without recalculating',
    args: {
      vesselId:          t.arg.string({ required: true }),
      certificateNumber: t.arg.string(),
      certifiedBy:       t.arg.string(),
      certifiedAt:       t.arg({ type: 'DateTime' }),
    },
    resolve: async (query, _, args) => {
      await updateCertification(args.vesselId, {
        certificateNumber: args.certificateNumber ?? undefined,
        certifiedBy:       args.certifiedBy ?? undefined,
        certifiedAt:       args.certifiedAt ?? undefined,
      });
      return prisma.eexiRecord.findUniqueOrThrow({
        ...query,
        where: { vesselId: args.vesselId },
      });
    },
  }),
);
