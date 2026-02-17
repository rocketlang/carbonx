// EEXI schema — Phase 5 (stub)
import { builder } from '../builder.js';

builder.prismaObject('EexiRecord', {
  fields: (t) => ({
    id: t.exposeID('id'),
    vesselId: t.exposeString('vesselId'),
    attainedEexi: t.exposeFloat('attainedEexi', { nullable: true }),
    requiredEexi: t.exposeFloat('requiredEexi', { nullable: true }),
    isCompliant: t.exposeBoolean('isCompliant'),
    certificateNumber: t.exposeString('certificateNumber', { nullable: true }),
    certifiedBy: t.exposeString('certifiedBy', { nullable: true }),
    vessel: t.relation('vessel'),
  }),
});
