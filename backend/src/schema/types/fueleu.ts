// FuelEU Maritime schema — Phase 4 (stub)
import { builder } from '../builder.js';

builder.prismaObject('FuelEuRecord', {
  fields: (t) => ({
    id: t.exposeID('id'),
    vesselId: t.exposeString('vesselId'),
    year: t.exposeInt('year'),
    actualGhgIntensity: t.exposeFloat('actualGhgIntensity', { nullable: true }),
    targetGhgIntensity: t.exposeFloat('targetGhgIntensity', { nullable: true }),
    ghgGap: t.exposeFloat('ghgGap', { nullable: true }),
    isCompliant: t.exposeBoolean('isCompliant'),
    penaltyEur: t.exposeFloat('penaltyEur'),
    vessel: t.relation('vessel'),
  }),
});
