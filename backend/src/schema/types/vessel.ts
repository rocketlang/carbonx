import { builder } from '../builder.js';

builder.prismaObject('Vessel', {
  description: 'A vessel tracked in CarbonX',
  fields: (t) => ({
    id: t.exposeID('id'),
    imo: t.exposeString('imo'),
    name: t.exposeString('name'),
    type: t.exposeString('type'),
    flag: t.exposeString('flag'),
    dwt: t.exposeFloat('dwt'),
    gt: t.exposeFloat('gt'),
    yearBuilt: t.exposeInt('yearBuilt'),
    enginePowerKw: t.exposeFloat('enginePowerKw', { nullable: true }),
    organizationId: t.exposeString('organizationId'),
    mari8xVesselId: t.exposeString('mari8xVesselId', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
    ciiRecords: t.relation('ciiRecords'),
    voyages: t.relation('voyages'),
  }),
});

builder.queryField('vessels', (t) =>
  t.prismaField({
    type: ['Vessel'],
    description: 'List all vessels for the authenticated organization',
    resolve: (query, _root, _args, ctx) =>
      ctx.prisma.vessel.findMany({
        ...query,
        where: ctx.orgFilter(),
        orderBy: { name: 'asc' },
      }),
  }),
);

builder.queryField('vessel', (t) =>
  t.prismaField({
    type: 'Vessel',
    nullable: true,
    args: { id: t.arg.string({ required: true }) },
    resolve: (query, _root, args, ctx) =>
      ctx.prisma.vessel.findUnique({ ...query, where: { id: args.id } }),
  }),
);

builder.mutationField('createVessel', (t) =>
  t.prismaField({
    type: 'Vessel',
    args: {
      imo: t.arg.string({ required: true }),
      name: t.arg.string({ required: true }),
      type: t.arg.string({ required: true }),
      flag: t.arg.string({ required: true }),
      dwt: t.arg.float({ required: true }),
      gt: t.arg.float({ required: true }),
      yearBuilt: t.arg.int({ required: true }),
      enginePowerKw: t.arg.float(),
      mari8xVesselId: t.arg.string(),
    },
    resolve: (query, _root, args, ctx) =>
      ctx.prisma.vessel.create({
        ...query,
        data: {
          imo: args.imo,
          name: args.name,
          type: args.type,
          flag: args.flag,
          dwt: args.dwt,
          gt: args.gt,
          yearBuilt: args.yearBuilt,
          organizationId: ctx.orgId(),
          enginePowerKw: args.enginePowerKw ?? undefined,
          mari8xVesselId: args.mari8xVesselId ?? undefined,
        },
      }),
  }),
);
