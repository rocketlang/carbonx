import { builder } from '../builder.js';

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

builder.queryField('voyages', (t) =>
  t.prismaField({
    type: ['Voyage'],
    args: {
      vesselId: t.arg.string({ required: true }),
      year: t.arg.int(),
    },
    resolve: (query, _root, args, ctx) => {
      const where: Record<string, unknown> = { vesselId: args.vesselId };
      if (args.year) {
        where.departureAt = {
          gte: new Date(`${args.year}-01-01`),
          lte: new Date(`${args.year}-12-31T23:59:59`),
        };
      }
      return ctx.prisma.voyage.findMany({
        ...query,
        where,
        orderBy: { departureAt: 'desc' },
      });
    },
  }),
);

builder.mutationField('createVoyage', (t) =>
  t.prismaField({
    type: 'Voyage',
    args: {
      vesselId: t.arg.string({ required: true }),
      voyageNumber: t.arg.string({ required: true }),
      departurePort: t.arg.string({ required: true }),
      arrivalPort: t.arg.string({ required: true }),
      departurePortCountry: t.arg.string({ required: true }),
      arrivalPortCountry: t.arg.string({ required: true }),
      departureAt: t.arg({ type: 'DateTime', required: true }),
      arrivalAt: t.arg({ type: 'DateTime' }),
      distanceNm: t.arg.float({ required: true }),
      hfoConsumedMt: t.arg.float(),
      mgoConsumedMt: t.arg.float(),
      lngConsumedMt: t.arg.float(),
      methanolConsumedMt: t.arg.float(),
      biofuelConsumedMt: t.arg.float(),
      etsScope: t.arg.string(),
      status: t.arg.string(),
    },
    resolve: (query, _root, args, ctx) =>
      ctx.prisma.voyage.create({
        ...query,
        data: {
          vesselId: args.vesselId,
          voyageNumber: args.voyageNumber,
          departurePort: args.departurePort,
          arrivalPort: args.arrivalPort,
          departurePortCountry: args.departurePortCountry,
          arrivalPortCountry: args.arrivalPortCountry,
          departureAt: args.departureAt as Date,
          arrivalAt: args.arrivalAt as Date | undefined,
          distanceNm: args.distanceNm,
          hfoConsumedMt: args.hfoConsumedMt ?? 0,
          mgoConsumedMt: args.mgoConsumedMt ?? 0,
          lngConsumedMt: args.lngConsumedMt ?? 0,
          methanolConsumedMt: args.methanolConsumedMt ?? 0,
          biofuelConsumedMt: args.biofuelConsumedMt ?? 0,
          etsScope: args.etsScope ?? 'none',
          status: args.status ?? 'completed',
        },
      }),
  }),
);
