import { builder } from '../builder.js';
import { calculateRequiredCii, getCiiBoundaries } from '../../services/cii/cii-calculator.js';

// Fleet-level carbon analytics
const VesselCiiSnapshot = builder.objectRef<{
  vesselId: string;
  name: string;
  imo: string;
  type: string;
  rating: string;
  ciiRatio: number;
  attainedCii: number;
  requiredCii: number;
  year: number;
}>('VesselCiiSnapshot');

VesselCiiSnapshot.implement({
  fields: (t) => ({
    vesselId: t.exposeString('vesselId'),
    name: t.exposeString('name'),
    imo: t.exposeString('imo'),
    type: t.exposeString('type'),
    rating: t.exposeString('rating'),
    ciiRatio: t.exposeFloat('ciiRatio'),
    attainedCii: t.exposeFloat('attainedCii'),
    requiredCii: t.exposeFloat('requiredCii'),
    year: t.exposeInt('year'),
  }),
});

const CiiBoundaries = builder.objectRef<{
  ab: number; bc: number; cd: number; de: number
}>('CiiBoundaries');

CiiBoundaries.implement({
  fields: (t) => ({
    ab: t.exposeFloat('ab'),
    bc: t.exposeFloat('bc'),
    cd: t.exposeFloat('cd'),
    de: t.exposeFloat('de'),
  }),
});

// ─── Queries ────────────────────────────────

builder.queryField('fleetCiiSnapshots', (t) =>
  t.field({
    type: [VesselCiiSnapshot],
    description: 'Full CII snapshot for all vessels in a given year',
    args: { year: t.arg.int({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const records = await ctx.prisma.ciiRecord.findMany({
        where: { year: args.year, vessel: ctx.orgFilter() },
        include: { vessel: { select: { name: true, imo: true, type: true } } },
        orderBy: { ciiRatio: 'desc' },
      });

      return records.map((r) => ({
        vesselId: r.vesselId,
        name: r.vessel.name,
        imo: r.vessel.imo,
        type: r.vessel.type,
        rating: r.rating ?? 'C',
        ciiRatio: r.ciiRatio ?? 1,
        attainedCii: r.attainedCii ?? 0,
        requiredCii: r.requiredCii ?? 0,
        year: r.year,
      }));
    },
  }),
);

builder.queryField('ciiBoundaries', (t) =>
  t.field({
    type: CiiBoundaries,
    description: 'Get rating boundary multipliers for a vessel type (MEPC.354(78) dd vectors)',
    args: { vesselType: t.arg.string({ required: true }) },
    resolve: (_root, args) => getCiiBoundaries(args.vesselType),
  }),
);

builder.queryField('ciiRequiredLine', (t) =>
  t.field({
    type: 'JSON',
    description: 'Required CII reference line values for a vessel type from 2023–2030',
    args: {
      vesselType: t.arg.string({ required: true }),
      dwt: t.arg.float({ required: true }),
    },
    resolve: (_root, args) => {
      const years = [2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030];
      return years.map((year) => {
        const { requiredCii, reductionFactor } = calculateRequiredCii(
          args.vesselType,
          args.dwt,
          year,
        );
        return { year, requiredCii, reductionFactor };
      });
    },
  }),
);
