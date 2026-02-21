/**
 * CV Safety — Maritime vessel CCTV & incident management
 * Uses Pothos prismaObject + objectRef (no extra plugins needed).
 * terminalId = vesselId in maritime context.
 */

import { builder } from '../builder.js';

// ── TS interfaces for non-Prisma return types ─────────────────────────────────

interface ZoneCount         { zone: string; count: number }
interface SeverityCount     { severity: string; count: number }
interface IncidentTypeCount { type: string; count: number }
interface CameraStats {
  total: number; active: number; offline: number; byZone: ZoneCount[];
}
interface SafetyDashboardData {
  terminalId: string; openIncidents: number; criticalOpen: number;
  last24hIncidents: number; last7dIncidents: number; activeCameras: number;
  bySeverity: SeverityCount[]; topIncidentTypes: IncidentTypeCount[];
}

// ── objectRef definitions (declare before implement) ─────────────────────────

const ZoneCountRef         = builder.objectRef<ZoneCount>('ZoneCount');
const SeverityCountRef     = builder.objectRef<SeverityCount>('SeverityCount');
const TypeCountRef         = builder.objectRef<IncidentTypeCount>('IncidentTypeCount');
const CameraStatsRef       = builder.objectRef<CameraStats>('CameraStats');
const SafetyDashboardRef   = builder.objectRef<SafetyDashboardData>('SafetyDashboard');

ZoneCountRef.implement({
  fields: (t) => ({
    zone:  t.exposeString('zone'),
    count: t.exposeInt('count'),
  }),
});

SeverityCountRef.implement({
  fields: (t) => ({
    severity: t.exposeString('severity'),
    count:    t.exposeInt('count'),
  }),
});

TypeCountRef.implement({
  fields: (t) => ({
    type:  t.exposeString('type'),
    count: t.exposeInt('count'),
  }),
});

CameraStatsRef.implement({
  fields: (t) => ({
    total:   t.exposeInt('total'),
    active:  t.exposeInt('active'),
    offline: t.exposeInt('offline'),
    byZone:  t.expose('byZone', { type: [ZoneCountRef] }),
  }),
});

SafetyDashboardRef.implement({
  fields: (t) => ({
    terminalId:       t.exposeString('terminalId'),
    openIncidents:    t.exposeInt('openIncidents'),
    criticalOpen:     t.exposeInt('criticalOpen'),
    last24hIncidents: t.exposeInt('last24hIncidents'),
    last7dIncidents:  t.exposeInt('last7dIncidents'),
    activeCameras:    t.exposeInt('activeCameras'),
    bySeverity:       t.expose('bySeverity',       { type: [SeverityCountRef] }),
    topIncidentTypes: t.expose('topIncidentTypes', { type: [TypeCountRef] }),
  }),
});

// ── Prisma Object Types ───────────────────────────────────────────────────────

builder.prismaObject('CctvCamera', {
  description: 'CCTV camera installed on a vessel or port terminal',
  fields: (t) => ({
    id:           t.exposeString('id'),
    terminalId:   t.exposeString('terminalId'),
    cameraCode:   t.exposeString('cameraCode'),
    name:         t.exposeString('name'),
    zone:         t.exposeString('zone'),
    location:     t.exposeString('location'),
    status:       t.exposeString('status'),
    domainType:   t.exposeString('domainType'),
    streamUrl:    t.exposeString('streamUrl',    { nullable: true }),
    manufacturer: t.exposeString('manufacturer', { nullable: true }),
    model:        t.exposeString('model',        { nullable: true }),
    lastPingAt:   t.expose('lastPingAt', { type: 'DateTime', nullable: true }),
    createdAt:    t.expose('createdAt',  { type: 'DateTime' }),
  }),
});

builder.prismaObject('SafetyIncident', {
  description: 'A safety incident detected on a vessel or terminal',
  fields: (t) => ({
    id:             t.exposeString('id'),
    terminalId:     t.exposeString('terminalId'),
    cameraId:       t.exposeString('cameraId',       { nullable: true }),
    incidentType:   t.exposeString('incidentType'),
    severity:       t.exposeString('severity'),
    status:         t.exposeString('status'),
    location:       t.exposeString('location'),
    description:    t.exposeString('description'),
    detectedBy:     t.exposeString('detectedBy'),
    domainType:     t.exposeString('domainType'),
    detectedAt:     t.expose('detectedAt', { type: 'DateTime' }),
    acknowledgedBy: t.exposeString('acknowledgedBy', { nullable: true }),
    resolvedBy:     t.exposeString('resolvedBy',     { nullable: true }),
    createdAt:      t.expose('createdAt',  { type: 'DateTime' }),
    updatedAt:      t.expose('updatedAt',  { type: 'DateTime' }),
  }),
});

builder.prismaObject('SafetyRule', {
  description: 'A safety rule configured for a vessel or terminal',
  fields: (t) => ({
    id:          t.exposeString('id'),
    terminalId:  t.exposeString('terminalId'),
    name:        t.exposeString('name'),
    description: t.exposeString('description'),
    ruleType:    t.exposeString('ruleType'),
    severity:    t.exposeString('severity'),
    isActive:    t.exposeBoolean('isActive'),
    domainType:  t.exposeString('domainType'),
    createdAt:   t.expose('createdAt', { type: 'DateTime' }),
    updatedAt:   t.expose('updatedAt', { type: 'DateTime' }),
  }),
});

// ── Queries ───────────────────────────────────────────────────────────────────

builder.queryField('cctvCameras', (t) =>
  t.prismaField({
    type: ['CctvCamera'],
    description: 'List CCTV cameras for a vessel or terminal',
    args: {
      terminalId: t.arg.string({ required: true }),
      zone:       t.arg.string(),
      status:     t.arg.string(),
    },
    resolve: (query, _root, args, ctx) => {
      if (!ctx.user) throw new Error('Unauthorized');
      return ctx.prisma.cctvCamera.findMany({
        ...query,
        where: {
          terminalId: args.terminalId,
          ...(args.zone   ? { zone:   args.zone   } : {}),
          ...(args.status ? { status: args.status } : {}),
        },
        orderBy: { createdAt: 'desc' },
      });
    },
  }),
);

builder.queryField('cameraStats', (t) =>
  t.field({
    type: CameraStatsRef,
    description: 'Camera statistics for a vessel or terminal',
    args: { terminalId: t.arg.string({ required: true }) },
    resolve: async (_root, args, ctx) => {
      if (!ctx.user) throw new Error('Unauthorized');
      const cameras = await ctx.prisma.cctvCamera.findMany({ where: { terminalId: args.terminalId } });
      const byZoneMap: Record<string, number> = {};
      for (const c of cameras) byZoneMap[c.zone] = (byZoneMap[c.zone] ?? 0) + 1;
      return {
        total:   cameras.length,
        active:  cameras.filter(c => c.status === 'active').length,
        offline: cameras.filter(c => c.status === 'offline').length,
        byZone:  Object.entries(byZoneMap).map(([zone, count]) => ({ zone, count })),
      };
    },
  }),
);

builder.queryField('safetyIncidents', (t) =>
  t.prismaField({
    type: ['SafetyIncident'],
    description: 'List safety incidents for a vessel or terminal',
    args: {
      terminalId: t.arg.string({ required: true }),
      status:     t.arg.string(),
      severity:   t.arg.string(),
      limit:      t.arg.int(),
    },
    resolve: (query, _root, args, ctx) => {
      if (!ctx.user) throw new Error('Unauthorized');
      return ctx.prisma.safetyIncident.findMany({
        ...query,
        where: {
          terminalId: args.terminalId,
          ...(args.status   ? { status:   args.status   } : {}),
          ...(args.severity ? { severity: args.severity } : {}),
        },
        orderBy: { detectedAt: 'desc' },
        take: args.limit ?? 50,
      });
    },
  }),
);

builder.queryField('safetyDashboard', (t) =>
  t.field({
    type: SafetyDashboardRef,
    description: 'Aggregated CV Safety KPIs for a vessel or terminal',
    args: { terminalId: t.arg.string({ required: true }) },
    resolve: async (_root, args, ctx) => {
      if (!ctx.user) throw new Error('Unauthorized');
      const now  = new Date();
      const h24  = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const d7   = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);
      const tid  = args.terminalId;

      const [openIncidents, criticalOpen, last24h, last7d, activeCameras, severityGroups, typeGroups] =
        await Promise.all([
          ctx.prisma.safetyIncident.count({ where: { terminalId: tid, status: 'open' } }),
          ctx.prisma.safetyIncident.count({ where: { terminalId: tid, status: 'open', severity: 'critical' } }),
          ctx.prisma.safetyIncident.count({ where: { terminalId: tid, detectedAt: { gte: h24 } } }),
          ctx.prisma.safetyIncident.count({ where: { terminalId: tid, detectedAt: { gte: d7  } } }),
          ctx.prisma.cctvCamera.count(    { where: { terminalId: tid, status: 'active' } }),
          ctx.prisma.safetyIncident.groupBy({ by: ['severity'],     where: { terminalId: tid }, _count: true }),
          ctx.prisma.safetyIncident.groupBy({ by: ['incidentType'], where: { terminalId: tid }, _count: true,
            orderBy: { _count: { incidentType: 'desc' } }, take: 5 }),
        ]);

      return {
        terminalId:       tid,
        openIncidents,
        criticalOpen,
        last24hIncidents: last24h,
        last7dIncidents:  last7d,
        activeCameras,
        bySeverity:       severityGroups.map(g => ({ severity: g.severity,     count: g._count })),
        topIncidentTypes: typeGroups.map(g     => ({ type:     g.incidentType, count: g._count })),
      };
    },
  }),
);

// ── Mutations ─────────────────────────────────────────────────────────────────

builder.mutationField('registerCamera', (t) =>
  t.prismaField({
    type: 'CctvCamera',
    description: 'Register a new CCTV camera on a vessel or terminal',
    args: {
      terminalId:  t.arg.string({ required: true }),
      cameraCode:  t.arg.string({ required: true }),
      name:        t.arg.string({ required: true }),
      zone:        t.arg.string({ required: true }),
      location:    t.arg.string({ required: true }),
      domainType:  t.arg.string(),
      streamUrl:   t.arg.string(),
    },
    resolve: (query, _root, args, ctx) => {
      if (!ctx.user) throw new Error('Unauthorized');
      return ctx.prisma.cctvCamera.create({
        ...query,
        data: {
          terminalId:  args.terminalId,
          cameraCode:  args.cameraCode,
          name:        args.name,
          zone:        args.zone,
          location:    args.location,
          domainType:  args.domainType ?? 'MARITIME',
          streamUrl:   args.streamUrl  ?? undefined,
        },
      });
    },
  }),
);

builder.mutationField('pingCamera', (t) =>
  t.prismaField({
    type: 'CctvCamera',
    description: 'Ping a camera to update its last-seen timestamp',
    args: { id: t.arg.string({ required: true }) },
    resolve: (query, _root, args, ctx) => {
      if (!ctx.user) throw new Error('Unauthorized');
      return ctx.prisma.cctvCamera.update({
        ...query,
        where: { id: args.id },
        data:  { lastPingAt: new Date(), status: 'active' },
      });
    },
  }),
);

builder.mutationField('updateCameraStatus', (t) =>
  t.prismaField({
    type: 'CctvCamera',
    description: 'Update camera status (active / offline / maintenance)',
    args: {
      id:     t.arg.string({ required: true }),
      status: t.arg.string({ required: true }),
    },
    resolve: (query, _root, args, ctx) => {
      if (!ctx.user) throw new Error('Unauthorized');
      return ctx.prisma.cctvCamera.update({
        ...query,
        where: { id: args.id },
        data:  { status: args.status },
      });
    },
  }),
);

builder.mutationField('reportIncident', (t) =>
  t.prismaField({
    type: 'SafetyIncident',
    description: 'Report a new safety incident',
    args: {
      terminalId:   t.arg.string({ required: true }),
      incidentType: t.arg.string({ required: true }),
      severity:     t.arg.string(),
      location:     t.arg.string({ required: true }),
      description:  t.arg.string({ required: true }),
      domainType:   t.arg.string(),
      cameraId:     t.arg.string(),
    },
    resolve: (query, _root, args, ctx) => {
      if (!ctx.user) throw new Error('Unauthorized');
      return ctx.prisma.safetyIncident.create({
        ...query,
        data: {
          terminalId:   args.terminalId,
          incidentType: args.incidentType,
          severity:     args.severity   ?? 'medium',
          location:     args.location,
          description:  args.description,
          domainType:   args.domainType ?? 'MARITIME',
          cameraId:     args.cameraId   ?? undefined,
          detectedBy:   ctx.user.name ?? ctx.user.email,
        },
      });
    },
  }),
);

builder.mutationField('acknowledgeIncident', (t) =>
  t.prismaField({
    type: 'SafetyIncident',
    description: 'Acknowledge a safety incident',
    args: {
      id:             t.arg.string({ required: true }),
      acknowledgedBy: t.arg.string({ required: true }),
    },
    resolve: (query, _root, args, ctx) => {
      if (!ctx.user) throw new Error('Unauthorized');
      return ctx.prisma.safetyIncident.update({
        ...query,
        where: { id: args.id },
        data:  { status: 'acknowledged', acknowledgedBy: args.acknowledgedBy },
      });
    },
  }),
);

builder.mutationField('resolveIncident', (t) =>
  t.prismaField({
    type: 'SafetyIncident',
    description: 'Resolve a safety incident',
    args: {
      id:         t.arg.string({ required: true }),
      resolvedBy: t.arg.string({ required: true }),
      resolution: t.arg.string({ required: true }),
    },
    resolve: (query, _root, args, ctx) => {
      if (!ctx.user) throw new Error('Unauthorized');
      return ctx.prisma.safetyIncident.update({
        ...query,
        where: { id: args.id },
        data:  { status: 'resolved', resolvedBy: args.resolvedBy, description: args.resolution },
      });
    },
  }),
);

builder.mutationField('escalateIncident', (t) =>
  t.prismaField({
    type: 'SafetyIncident',
    description: 'Escalate a safety incident to another officer',
    args: {
      id:          t.arg.string({ required: true }),
      escalatedTo: t.arg.string({ required: true }),
      reason:      t.arg.string({ required: true }),
    },
    resolve: (query, _root, args, ctx) => {
      if (!ctx.user) throw new Error('Unauthorized');
      return ctx.prisma.safetyIncident.update({
        ...query,
        where: { id: args.id },
        data:  {
          status:      'escalated',
          resolvedBy:  args.escalatedTo,
          description: `[Escalated to ${args.escalatedTo}] ${args.reason}`,
        },
      });
    },
  }),
);
