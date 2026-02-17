/**
 * Regulatory Reports GraphQL Schema — Phase 7
 * Returns structured JSON payloads for each report type.
 * Frontend renders print-ready HTML from the data.
 */

import { builder } from '../builder.js';
import {
  generateMrvReport,
  generateDcsReport,
  generateCiiComplianceReport,
  generateFuelEuReport,
  generateEexiReport,
  generateFleetSummary,
} from '../../services/reports/report-generator.js';

// All reports return JSON (flexible structure per regulation)
// The frontend handles rendering and printing.

builder.queryField('reportMrv', (t) =>
  t.field({
    type: 'JSON',
    description: 'EU MRV Annual Emissions Report — Regulation (EU) 2015/757',
    args: { year: t.arg.int({ required: true }) },
    resolve: (_, { year }, ctx) => generateMrvReport(ctx.orgId(), year),
  }),
);

builder.queryField('reportDcs', (t) =>
  t.field({
    type: 'JSON',
    description: 'IMO DCS Annual Fuel Oil Consumption Report — MARPOL Annex VI Reg. 22A',
    args: { year: t.arg.int({ required: true }) },
    resolve: (_, { year }, ctx) => generateDcsReport(ctx.orgId(), year),
  }),
);

builder.queryField('reportCiiCompliance', (t) =>
  t.field({
    type: 'JSON',
    description: 'CII Annual Statement of Compliance — MEPC.337(76) + MEPC.354(78)',
    args: { year: t.arg.int({ required: true }) },
    resolve: (_, { year }, ctx) => generateCiiComplianceReport(ctx.orgId(), year),
  }),
);

builder.queryField('reportFuelEu', (t) =>
  t.field({
    type: 'JSON',
    description: 'FuelEU Annual Compliance Report — Regulation (EU) 2023/1805 Art. 8',
    args: { year: t.arg.int({ required: true }) },
    resolve: (_, { year }, ctx) => generateFuelEuReport(ctx.orgId(), year),
  }),
);

builder.queryField('reportEexi', (t) =>
  t.field({
    type: 'JSON',
    description: 'EEXI Technical File Summary — MEPC.333(76) Reg. 27',
    resolve: (_, __, ctx) => generateEexiReport(ctx.orgId()),
  }),
);

builder.queryField('reportFleetSummary', (t) =>
  t.field({
    type: 'JSON',
    description: 'Fleet Carbon Executive Summary — all modules combined',
    args: { year: t.arg.int({ required: true }) },
    resolve: (_, { year }, ctx) => generateFleetSummary(ctx.orgId(), year),
  }),
);
