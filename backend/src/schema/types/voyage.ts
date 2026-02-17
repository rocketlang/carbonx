import { builder } from '../builder.js';
import { CO2_FACTORS } from '../../services/cii/cii-calculator.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcCo2(args: {
  hfoConsumedMt?: number | null;
  mgoConsumedMt?: number | null;
  lngConsumedMt?: number | null;
  methanolConsumedMt?: number | null;
  biofuelConsumedMt?: number | null;
}): number {
  return (
    (args.hfoConsumedMt ?? 0) * CO2_FACTORS.hfo +
    (args.mgoConsumedMt ?? 0) * CO2_FACTORS.mgo +
    (args.lngConsumedMt ?? 0) * CO2_FACTORS.lng +
    (args.methanolConsumedMt ?? 0) * (CO2_FACTORS as any).methanol ?? 2.75 +
    (args.biofuelConsumedMt ?? 0) * 0
  );
}

function calcEtsCo2(co2Mt: number, scope: string): number {
  if (scope === 'eu_eu')      return co2Mt;
  if (scope === 'eu_non_eu')  return co2Mt * 0.5;
  return 0;
}

// EU country codes for ETS scope detection
const EU_COUNTRIES = new Set([
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU',
  'IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE',
  'IS','LI','NO', // EEA
]);

function inferEtsScope(depCountry: string, arrCountry: string): string {
  const depEu = EU_COUNTRIES.has(depCountry.toUpperCase());
  const arrEu = EU_COUNTRIES.has(arrCountry.toUpperCase());
  if (depEu && arrEu) return 'eu_eu';
  if (depEu || arrEu)  return 'eu_non_eu';
  return 'none';
}

// ─── Type definition ─────────────────────────────────────────────────────────

builder.prismaObject('Voyage', {
  description: 'A single voyage with fuel consumption data',
  fields: (t) => ({
    id: t.exposeID('id'),
    vesselId: t.exposeString('vesselId'),
    voyageNumber: t.exposeString('voyageNumber'),
    departurePort: t.exposeString('departurePort'),
    arrivalPort: t.exposeString('arrivalPort'),
    departurePortCountry: t.exposeString('departurePortCountry'),
    arrivalPortCountry: t.exposeString('arrivalPortCountry'),
    departureAt: t.expose('departureAt', { type: 'DateTime' }),
    arrivalAt: t.expose('arrivalAt', { type: 'DateTime', nullable: true }),
    distanceNm: t.exposeFloat('distanceNm'),
    hfoConsumedMt: t.exposeFloat('hfoConsumedMt'),
    mgoConsumedMt: t.exposeFloat('mgoConsumedMt'),
    lngConsumedMt: t.exposeFloat('lngConsumedMt'),
    methanolConsumedMt: t.exposeFloat('methanolConsumedMt'),
    biofuelConsumedMt: t.exposeFloat('biofuelConsumedMt'),
    co2EmissionsMt: t.exposeFloat('co2EmissionsMt'),
    etsScope: t.exposeString('etsScope'),
    etsCo2Applicable: t.exposeFloat('etsCo2Applicable'),
    status: t.exposeString('status'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    vessel: t.relation('vessel'),
  }),
});

// ─── Queries ─────────────────────────────────────────────────────────────────

/** Per-vessel voyages (with org ownership check) */
builder.queryField('voyages', (t) =>
  t.prismaField({
    type: ['Voyage'],
    description: 'Voyages for a specific vessel (org-scoped)',
    args: {
      vesselId: t.arg.string({ required: true }),
      year:     t.arg.int(),
      status:   t.arg.string(),
    },
    resolve: async (query, _root, args, ctx) => {
      // verify vessel belongs to org
      const vessel = await ctx.prisma.vessel.findFirst({
        where: { id: args.vesselId, ...ctx.orgFilter() },
        select: { id: true },
      });
      if (!vessel) throw new Error('Vessel not found');

      const where: Record<string, unknown> = { vesselId: args.vesselId };
      if (args.year) {
        where.departureAt = {
          gte: new Date(`${args.year}-01-01`),
          lte: new Date(`${args.year}-12-31T23:59:59`),
        };
      }
      if (args.status) where.status = args.status;

      return ctx.prisma.voyage.findMany({
        ...query,
        where,
        orderBy: { departureAt: 'desc' },
      });
    },
  }),
);

/** Fleet-wide voyages across all org vessels */
builder.queryField('fleetVoyages', (t) =>
  t.prismaField({
    type: ['Voyage'],
    description: 'All voyages across the organization fleet',
    args: {
      year:     t.arg.int(),
      vesselId: t.arg.string(),
      status:   t.arg.string(),
      limit:    t.arg.int(),
      offset:   t.arg.int(),
    },
    resolve: async (query, _root, args, ctx) => {
      const orgId = ctx.orgId();

      // get org vessel IDs
      const vessels = await ctx.prisma.vessel.findMany({
        where: { organizationId: orgId },
        select: { id: true },
      });
      const vesselIds = vessels.map((v) => v.id);

      const where: Record<string, unknown> = { vesselId: { in: vesselIds } };
      if (args.vesselId) where.vesselId = args.vesselId;
      if (args.year) {
        where.departureAt = {
          gte: new Date(`${args.year}-01-01`),
          lte: new Date(`${args.year}-12-31T23:59:59`),
        };
      }
      if (args.status) where.status = args.status;

      return ctx.prisma.voyage.findMany({
        ...query,
        where,
        orderBy: { departureAt: 'desc' },
        take:  args.limit  ?? 200,
        skip:  args.offset ?? 0,
      });
    },
  }),
);

/** Fleet voyage stats summary */
builder.queryField('fleetVoyageStats', (t) =>
  t.field({
    type: builder.objectRef<{
      totalVoyages:    number;
      euVoyages:       number;
      totalDistanceNm: number;
      totalCo2Mt:      number;
      totalEtsCo2Mt:   number;
      completedCount:  number;
      inProgressCount: number;
    }>('FleetVoyageStats').implement({
      fields: (tf) => ({
        totalVoyages:    tf.exposeInt('totalVoyages'),
        euVoyages:       tf.exposeInt('euVoyages'),
        totalDistanceNm: tf.exposeFloat('totalDistanceNm'),
        totalCo2Mt:      tf.exposeFloat('totalCo2Mt'),
        totalEtsCo2Mt:   tf.exposeFloat('totalEtsCo2Mt'),
        completedCount:  tf.exposeInt('completedCount'),
        inProgressCount: tf.exposeInt('inProgressCount'),
      }),
    }),
    args: { year: t.arg.int({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const orgId = ctx.orgId();
      const vessels = await ctx.prisma.vessel.findMany({
        where: { organizationId: orgId },
        select: { id: true },
      });
      const vesselIds = vessels.map((v) => v.id);

      const voyages = await ctx.prisma.voyage.findMany({
        where: {
          vesselId: { in: vesselIds },
          departureAt: {
            gte: new Date(`${args.year}-01-01`),
            lte: new Date(`${args.year}-12-31T23:59:59`),
          },
        },
        select: {
          distanceNm: true, co2EmissionsMt: true, etsCo2Applicable: true,
          etsScope: true, status: true,
        },
      });

      return {
        totalVoyages:    voyages.length,
        euVoyages:       voyages.filter((v) => v.etsScope !== 'none').length,
        totalDistanceNm: voyages.reduce((s, v) => s + v.distanceNm, 0),
        totalCo2Mt:      voyages.reduce((s, v) => s + v.co2EmissionsMt, 0),
        totalEtsCo2Mt:   voyages.reduce((s, v) => s + v.etsCo2Applicable, 0),
        completedCount:  voyages.filter((v) => v.status === 'completed').length,
        inProgressCount: voyages.filter((v) => v.status === 'in_progress').length,
      };
    },
  }),
);

// ─── Mutations ────────────────────────────────────────────────────────────────

builder.mutationField('createVoyage', (t) =>
  t.prismaField({
    type: 'Voyage',
    description: 'Log a new voyage with fuel data; CO₂ and ETS scope auto-calculated',
    args: {
      vesselId:             t.arg.string({ required: true }),
      voyageNumber:         t.arg.string({ required: true }),
      departurePort:        t.arg.string({ required: true }),
      arrivalPort:          t.arg.string({ required: true }),
      departurePortCountry: t.arg.string({ required: true }),
      arrivalPortCountry:   t.arg.string({ required: true }),
      departureAt:          t.arg({ type: 'DateTime', required: true }),
      arrivalAt:            t.arg({ type: 'DateTime' }),
      distanceNm:           t.arg.float({ required: true }),
      hfoConsumedMt:        t.arg.float(),
      mgoConsumedMt:        t.arg.float(),
      lngConsumedMt:        t.arg.float(),
      methanolConsumedMt:   t.arg.float(),
      biofuelConsumedMt:    t.arg.float(),
      etsScope:             t.arg.string(),   // optional override; auto-detected otherwise
      status:               t.arg.string(),
    },
    resolve: async (query, _root, args, ctx) => {
      // verify vessel belongs to org
      const vessel = await ctx.prisma.vessel.findFirst({
        where: { id: args.vesselId, ...ctx.orgFilter() },
        select: { id: true },
      });
      if (!vessel) throw new Error('Vessel not found');

      const scope = args.etsScope ??
        inferEtsScope(args.departurePortCountry, args.arrivalPortCountry);
      const co2 = calcCo2(args);
      const etsCo2 = calcEtsCo2(co2, scope);

      return ctx.prisma.voyage.create({
        ...query,
        data: {
          vesselId:             args.vesselId,
          voyageNumber:         args.voyageNumber,
          departurePort:        args.departurePort,
          arrivalPort:          args.arrivalPort,
          departurePortCountry: args.departurePortCountry,
          arrivalPortCountry:   args.arrivalPortCountry,
          departureAt:          args.departureAt as Date,
          arrivalAt:            args.arrivalAt as Date | undefined,
          distanceNm:           args.distanceNm,
          hfoConsumedMt:        args.hfoConsumedMt ?? 0,
          mgoConsumedMt:        args.mgoConsumedMt ?? 0,
          lngConsumedMt:        args.lngConsumedMt ?? 0,
          methanolConsumedMt:   args.methanolConsumedMt ?? 0,
          biofuelConsumedMt:    args.biofuelConsumedMt ?? 0,
          co2EmissionsMt:       co2,
          etsScope:             scope,
          etsCo2Applicable:     etsCo2,
          status:               args.status ?? 'completed',
        },
      });
    },
  }),
);

builder.mutationField('updateVoyage', (t) =>
  t.prismaField({
    type: 'Voyage',
    description: 'Update voyage fuel data; CO₂ and ETS scope recalculated',
    args: {
      id:                   t.arg.string({ required: true }),
      voyageNumber:         t.arg.string(),
      departurePort:        t.arg.string(),
      arrivalPort:          t.arg.string(),
      departurePortCountry: t.arg.string(),
      arrivalPortCountry:   t.arg.string(),
      departureAt:          t.arg({ type: 'DateTime' }),
      arrivalAt:            t.arg({ type: 'DateTime' }),
      distanceNm:           t.arg.float(),
      hfoConsumedMt:        t.arg.float(),
      mgoConsumedMt:        t.arg.float(),
      lngConsumedMt:        t.arg.float(),
      methanolConsumedMt:   t.arg.float(),
      biofuelConsumedMt:    t.arg.float(),
      etsScope:             t.arg.string(),
      status:               t.arg.string(),
    },
    resolve: async (query, _root, args, ctx) => {
      // verify voyage → vessel → org
      const voyage = await ctx.prisma.voyage.findFirstOrThrow({
        where: { id: args.id },
        include: { vessel: { select: { organizationId: true } } },
      });
      if (voyage.vessel.organizationId !== ctx.orgId()) throw new Error('Not found');

      // merge existing values with new ones
      const depCountry = args.departurePortCountry ?? voyage.departurePortCountry;
      const arrCountry = args.arrivalPortCountry   ?? voyage.arrivalPortCountry;
      const scope      = args.etsScope ?? inferEtsScope(depCountry, arrCountry);

      const fuels = {
        hfoConsumedMt:      args.hfoConsumedMt      ?? voyage.hfoConsumedMt,
        mgoConsumedMt:      args.mgoConsumedMt      ?? voyage.mgoConsumedMt,
        lngConsumedMt:      args.lngConsumedMt      ?? voyage.lngConsumedMt,
        methanolConsumedMt: args.methanolConsumedMt ?? voyage.methanolConsumedMt,
        biofuelConsumedMt:  args.biofuelConsumedMt  ?? voyage.biofuelConsumedMt,
      };
      const co2    = calcCo2(fuels);
      const etsCo2 = calcEtsCo2(co2, scope);

      return ctx.prisma.voyage.update({
        ...query,
        where: { id: args.id },
        data: {
          ...(args.voyageNumber         && { voyageNumber: args.voyageNumber }),
          ...(args.departurePort        && { departurePort: args.departurePort }),
          ...(args.arrivalPort          && { arrivalPort: args.arrivalPort }),
          ...(args.departurePortCountry && { departurePortCountry: depCountry }),
          ...(args.arrivalPortCountry   && { arrivalPortCountry: arrCountry }),
          ...(args.departureAt          && { departureAt: args.departureAt as Date }),
          ...(args.arrivalAt !== undefined && { arrivalAt: args.arrivalAt as Date | null }),
          ...(args.distanceNm !== null && args.distanceNm !== undefined && { distanceNm: args.distanceNm }),
          ...(args.status               && { status: args.status }),
          ...fuels,
          co2EmissionsMt:   co2,
          etsScope:         scope,
          etsCo2Applicable: etsCo2,
        },
      });
    },
  }),
);

builder.mutationField('deleteVoyage', (t) =>
  t.field({
    type: 'Boolean',
    description: 'Delete a voyage (org-owned only)',
    args: { id: t.arg.string({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const voyage = await ctx.prisma.voyage.findFirstOrThrow({
        where: { id: args.id },
        include: { vessel: { select: { organizationId: true } } },
      });
      if (voyage.vessel.organizationId !== ctx.orgId()) throw new Error('Not found');
      await ctx.prisma.voyage.delete({ where: { id: args.id } });
      return true;
    },
  }),
);

/** Batch CSV import — accepts JSON array of voyage rows */
builder.mutationField('importVoyages', (t) =>
  t.field({
    type: builder.objectRef<{ imported: number; errors: string[] }>('ImportVoyagesResult')
      .implement({
        fields: (tf) => ({
          imported: tf.exposeInt('imported'),
          errors:   tf.stringList({ resolve: (r) => r.errors }),
        }),
      }),
    description: 'Bulk-import voyages from parsed CSV data',
    args: {
      rows: t.arg({ type: 'JSON', required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const orgId = ctx.orgId();
      const rows = args.rows as any[];

      // cache vessel lookups
      const vesselCache = new Map<string, string>(); // imo → id
      const orgVessels  = await ctx.prisma.vessel.findMany({
        where: { organizationId: orgId },
        select: { id: true, imo: true, name: true },
      });
      for (const v of orgVessels) {
        vesselCache.set(v.imo, v.id);
        vesselCache.set(v.name.toLowerCase(), v.id);
      }

      let imported = 0;
      const errors: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 1;
        try {
          // resolve vessel
          const vesselId = vesselCache.get(row.vesselImo)
            ?? vesselCache.get((row.vesselName ?? '').toLowerCase());
          if (!vesselId) {
            errors.push(`Row ${rowNum}: vessel not found (IMO="${row.vesselImo}", name="${row.vesselName}")`);
            continue;
          }

          const depCountry = String(row.departurePortCountry ?? '').toUpperCase();
          const arrCountry = String(row.arrivalPortCountry   ?? '').toUpperCase();
          const scope      = row.etsScope ?? inferEtsScope(depCountry, arrCountry);

          const fuels = {
            hfoConsumedMt:      Number(row.hfoConsumedMt      ?? 0),
            mgoConsumedMt:      Number(row.mgoConsumedMt      ?? 0),
            lngConsumedMt:      Number(row.lngConsumedMt      ?? 0),
            methanolConsumedMt: Number(row.methanolConsumedMt ?? 0),
            biofuelConsumedMt:  Number(row.biofuelConsumedMt  ?? 0),
          };
          const co2    = calcCo2(fuels);
          const etsCo2 = calcEtsCo2(co2, scope);

          await ctx.prisma.voyage.create({
            data: {
              vesselId,
              voyageNumber:         String(row.voyageNumber ?? `IMP-${Date.now()}-${i}`),
              departurePort:        String(row.departurePort ?? ''),
              arrivalPort:          String(row.arrivalPort ?? ''),
              departurePortCountry: depCountry,
              arrivalPortCountry:   arrCountry,
              departureAt:          new Date(row.departureAt),
              arrivalAt:            row.arrivalAt ? new Date(row.arrivalAt) : undefined,
              distanceNm:           Number(row.distanceNm ?? 0),
              ...fuels,
              co2EmissionsMt:   co2,
              etsScope:         scope,
              etsCo2Applicable: etsCo2,
              status:           String(row.status ?? 'completed'),
            },
          });
          imported++;
        } catch (e: any) {
          errors.push(`Row ${rowNum}: ${e.message}`);
        }
      }

      return { imported, errors };
    },
  }),
);
