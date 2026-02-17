// EU ETS schema — Phase 3 (stub to allow schema compilation)
import { builder } from '../builder.js';

builder.prismaObject('EtsAccount', {
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
  fields: (t) => ({
    id: t.exposeID('id'),
    vesselId: t.exposeString('vesselId'),
    year: t.exposeInt('year'),
    totalCo2Mt: t.exposeFloat('totalCo2Mt'),
    applicablePct: t.exposeFloat('applicablePct'),
    obligationMt: t.exposeFloat('obligationMt'),
    euaSurrendered: t.exposeFloat('euaSurrendered'),
    isSettled: t.exposeBoolean('isSettled'),
    vessel: t.relation('vessel'),
  }),
});

builder.prismaObject('EtsTransaction', {
  fields: (t) => ({
    id: t.exposeID('id'),
    accountId: t.exposeString('accountId'),
    type: t.exposeString('type'),
    euaAmount: t.exposeFloat('euaAmount'),
    priceEur: t.exposeFloat('priceEur', { nullable: true }),
    totalEur: t.exposeFloat('totalEur', { nullable: true }),
    transactedAt: t.expose('transactedAt', { type: 'DateTime' }),
    account: t.relation('account'),
  }),
});
