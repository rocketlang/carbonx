// Carbon Credits schema — Phase 6 (stub)
import { builder } from '../builder.js';

builder.prismaObject('CarbonCredit', {
  fields: (t) => ({
    id: t.exposeID('id'),
    organizationId: t.exposeString('organizationId'),
    standard: t.exposeString('standard'),
    projectName: t.exposeString('projectName'),
    projectType: t.exposeString('projectType'),
    country: t.exposeString('country'),
    vintage: t.exposeInt('vintage'),
    quantity: t.exposeFloat('quantity'),
    priceUsd: t.exposeFloat('priceUsd', { nullable: true }),
    status: t.exposeString('status'),
    retiredAt: t.expose('retiredAt', { type: 'DateTime', nullable: true }),
    retiredFor: t.exposeString('retiredFor', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
  }),
});
