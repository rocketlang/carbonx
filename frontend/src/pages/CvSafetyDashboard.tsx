/**
 * CvSafetyDashboard — Maritime vessel CCTV & safety incident management
 * Uses Apollo Client (gql) matching the CarbonX frontend pattern.
 * "terminalId" maps to vesselId in maritime context.
 */

import { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { Shield, Camera, AlertTriangle, CheckCircle, Clock, Video } from 'lucide-react';

// ── GQL ───────────────────────────────────────────────────────────────────────

const VESSELS_Q = gql`
  query { vessels { id imo name type } }
`;

const DASHBOARD_Q = gql`
  query SafetyDashboard($terminalId: String!) {
    safetyDashboard(terminalId: $terminalId) {
      terminalId openIncidents criticalOpen last24hIncidents last7dIncidents activeCameras
      bySeverity       { severity count }
      topIncidentTypes { type count }
    }
  }
`;

const CAMERAS_Q = gql`
  query CctvCameras($terminalId: String!, $zone: String, $status: String) {
    cctvCameras(terminalId: $terminalId, zone: $zone, status: $status) {
      id terminalId cameraCode name zone location status domainType streamUrl lastPingAt createdAt
    }
  }
`;

const INCIDENTS_Q = gql`
  query SafetyIncidents($terminalId: String!, $status: String, $severity: String) {
    safetyIncidents(terminalId: $terminalId, status: $status, severity: $severity, limit: 50) {
      id terminalId cameraId incidentType severity status location description
      detectedBy detectedAt acknowledgedBy resolvedBy
    }
  }
`;

const REGISTER_CAMERA_M = gql`
  mutation RegisterCamera($terminalId: String!, $cameraCode: String!, $name: String!, $zone: String!, $location: String!, $streamUrl: String) {
    registerCamera(terminalId: $terminalId, cameraCode: $cameraCode, name: $name, zone: $zone, location: $location, streamUrl: $streamUrl) {
      id name zone status
    }
  }
`;

const PING_CAMERA_M = gql`
  mutation PingCamera($id: String!) {
    pingCamera(id: $id) { id status lastPingAt }
  }
`;

const REPORT_INCIDENT_M = gql`
  mutation ReportIncident($terminalId: String!, $incidentType: String!, $severity: String, $location: String!, $description: String!) {
    reportIncident(terminalId: $terminalId, incidentType: $incidentType, severity: $severity, location: $location, description: $description) {
      id incidentType severity status
    }
  }
`;

const ACK_INCIDENT_M = gql`
  mutation AckIncident($id: String!, $acknowledgedBy: String!) {
    acknowledgeIncident(id: $id, acknowledgedBy: $acknowledgedBy) { id status acknowledgedBy }
  }
`;

const RESOLVE_INCIDENT_M = gql`
  mutation ResolveIncident($id: String!, $resolvedBy: String!, $resolution: String!) {
    resolveIncident(id: $id, resolvedBy: $resolvedBy, resolution: $resolution) { id status resolvedBy }
  }
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

const SEV_COLOR: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border border-red-500/30',
  high:     'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  medium:   'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  low:      'bg-blue-500/20 text-blue-400 border border-blue-500/30',
};

const STATUS_COLOR: Record<string, string> = {
  open:         'bg-red-500/20 text-red-400',
  acknowledged: 'bg-yellow-500/20 text-yellow-400',
  resolved:     'bg-emerald-500/20 text-emerald-400',
  escalated:    'bg-purple-500/20 text-purple-400',
};

const CAM_STATUS_COLOR: Record<string, string> = {
  active:      'bg-emerald-500/20 text-emerald-400',
  offline:     'bg-red-500/20 text-red-400',
  maintenance: 'bg-yellow-500/20 text-yellow-400',
};

function KpiCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string }) {
  const colors: Record<string, string> = {
    blue:    'from-blue-600/20 to-blue-500/5 border-blue-500/20',
    red:     'from-red-600/20 to-red-500/5 border-red-500/20',
    emerald: 'from-emerald-600/20 to-emerald-500/5 border-emerald-500/20',
    yellow:  'from-yellow-600/20 to-yellow-500/5 border-yellow-500/20',
  };
  const iconColors: Record<string, string> = {
    blue: 'text-blue-400', red: 'text-red-400', emerald: 'text-emerald-400', yellow: 'text-yellow-400',
  };
  return (
    <div className={`rounded-xl border bg-gradient-to-br p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={iconColors[color]}>{icon}</span>
        <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}

// ── Register Camera Modal ─────────────────────────────────────────────────────

function RegisterCameraModal({ vesselId, onClose, onDone }: { vesselId: string; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ cameraCode: '', name: '', zone: 'bridge', location: '', streamUrl: '' });
  const [registerCamera, { loading }] = useMutation(REGISTER_CAMERA_M, {
    onCompleted: () => { onDone(); onClose(); },
  });

  const zones = ['bridge', 'engine_room', 'deck', 'cargo_hold', 'accommodation', 'gangway', 'bow', 'stern'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Register CCTV Camera</h2>
        {(['cameraCode', 'name', 'location', 'streamUrl'] as const).map(f => (
          <div key={f}>
            <label className="text-xs text-gray-400 capitalize">{f.replace(/([A-Z])/g, ' $1')}</label>
            <input
              className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
              placeholder={f === 'streamUrl' ? 'rtsp://... (optional)' : ''}
              value={form[f]}
              onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
            />
          </div>
        ))}
        <div>
          <label className="text-xs text-gray-400">Zone</label>
          <select
            className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
            value={form.zone}
            onChange={e => setForm(p => ({ ...p, zone: e.target.value }))}
          >
            {zones.map(z => <option key={z} value={z}>{z.replace('_', ' ')}</option>)}
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 border border-gray-700 rounded-lg py-2 text-sm text-gray-400 hover:bg-gray-800">Cancel</button>
          <button
            disabled={loading || !form.cameraCode || !form.name || !form.location}
            onClick={() => registerCamera({ variables: { terminalId: vesselId, ...form, streamUrl: form.streamUrl || undefined } })}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg py-2 text-sm text-white font-medium"
          >
            {loading ? 'Registering…' : 'Register'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Report Incident Modal ─────────────────────────────────────────────────────

function ReportIncidentModal({ vesselId, onClose, onDone }: { vesselId: string; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ incidentType: 'security', severity: 'medium', location: '', description: '' });
  const [reportIncident, { loading }] = useMutation(REPORT_INCIDENT_M, {
    onCompleted: () => { onDone(); onClose(); },
  });

  const types = ['fire', 'man_overboard', 'flooding', 'collision', 'medical', 'security', 'ppe_violation', 'hazmat'];
  const severities = ['low', 'medium', 'high', 'critical'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Report Safety Incident</h2>
        <div>
          <label className="text-xs text-gray-400">Incident Type</label>
          <select className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
            value={form.incidentType} onChange={e => setForm(p => ({ ...p, incidentType: e.target.value }))}>
            {types.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400">Severity</label>
          <select className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
            value={form.severity} onChange={e => setForm(p => ({ ...p, severity: e.target.value }))}>
            {severities.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400">Location</label>
          <input className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
            value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-gray-400">Description</label>
          <textarea rows={3} className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white resize-none"
            value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 border border-gray-700 rounded-lg py-2 text-sm text-gray-400 hover:bg-gray-800">Cancel</button>
          <button
            disabled={loading || !form.location || !form.description}
            onClick={() => reportIncident({ variables: { terminalId: vesselId, ...form } })}
            className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg py-2 text-sm text-white font-medium"
          >
            {loading ? 'Reporting…' : 'Report Incident'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function CvSafetyDashboard() {
  const [vesselId, setVesselId] = useState('');
  const [tab, setTab] = useState<'cameras' | 'incidents'>('cameras');
  const [showRegister, setShowRegister] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const { data: vesselData, loading: vLoading } = useQuery(VESSELS_Q);
  const vessels: { id: string; imo: string; name: string; type: string }[] = vesselData?.vessels ?? [];

  const { data: dash, refetch: refetchDash } = useQuery(DASHBOARD_Q, {
    variables: { terminalId: vesselId },
    skip: !vesselId,
  });
  const { data: camData, refetch: refetchCams } = useQuery(CAMERAS_Q, {
    variables: { terminalId: vesselId },
    skip: !vesselId,
  });
  const { data: incData, refetch: refetchInc } = useQuery(INCIDENTS_Q, {
    variables: { terminalId: vesselId },
    skip: !vesselId,
  });

  const [pingCamera] = useMutation(PING_CAMERA_M, { onCompleted: () => refetchCams() });
  const [ackIncident] = useMutation(ACK_INCIDENT_M, { onCompleted: () => { refetchInc(); refetchDash(); } });
  const [resolveIncident] = useMutation(RESOLVE_INCIDENT_M, { onCompleted: () => { refetchInc(); refetchDash(); } });

  const dashboard = dash?.safetyDashboard;
  const cameras: any[] = camData?.cctvCameras ?? [];
  const incidents: any[] = incData?.safetyIncidents ?? [];

  const selectedVessel = vessels.find(v => v.id === vesselId);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="h-6 w-6 text-emerald-400" />
            CV Safety Monitor
          </h1>
          <p className="text-gray-400 mt-0.5 text-sm">Vessel CCTV cameras &amp; safety incident management</p>
        </div>
        {vesselId && (
          <div className="flex gap-2">
            <button onClick={() => setShowRegister(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300">
              <Camera className="h-4 w-4" /> Add Camera
            </button>
            <button onClick={() => setShowReport(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm text-white font-medium">
              <AlertTriangle className="h-4 w-4" /> Report Incident
            </button>
          </div>
        )}
      </div>

      {/* Vessel selector */}
      <div className="max-w-sm">
        <label className="text-xs text-gray-500 uppercase tracking-wide">Select Vessel</label>
        <select
          className="mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          value={vesselId}
          onChange={e => setVesselId(e.target.value)}
        >
          <option value="">{vLoading ? 'Loading…' : '— select a vessel —'}</option>
          {vessels.map(v => (
            <option key={v.id} value={v.id}>{v.name} ({v.imo}) · {v.type}</option>
          ))}
        </select>
      </div>

      {!vesselId && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-12 text-center">
          <Shield className="h-12 w-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">Select a vessel to view its CV Safety dashboard</p>
        </div>
      )}

      {vesselId && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard icon={<Camera className="h-5 w-5" />}   label="Active Cameras"   value={dashboard?.activeCameras    ?? '—'} color="emerald" />
            <KpiCard icon={<AlertTriangle className="h-5 w-5" />} label="Open Incidents" value={dashboard?.openIncidents ?? '—'} color="red" />
            <KpiCard icon={<Shield className="h-5 w-5" />}    label="Critical Open"    value={dashboard?.criticalOpen     ?? '—'} color="red" />
            <KpiCard icon={<Clock className="h-5 w-5" />}     label="Last 24 h"        value={dashboard?.last24hIncidents ?? '—'} sub="incidents" color="yellow" />
          </div>

          {/* Breakdown pills */}
          {dashboard && (dashboard.bySeverity.length > 0 || dashboard.topIncidentTypes.length > 0) && (
            <div className="grid sm:grid-cols-2 gap-4">
              {dashboard.bySeverity.length > 0 && (
                <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
                  <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-3">By Severity</h3>
                  <div className="flex flex-wrap gap-2">
                    {dashboard.bySeverity.map((s: any) => (
                      <span key={s.severity} className={`px-2.5 py-1 rounded-full text-xs font-medium ${SEV_COLOR[s.severity] ?? 'bg-gray-700 text-gray-300'}`}>
                        {s.severity} · {s.count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {dashboard.topIncidentTypes.length > 0 && (
                <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
                  <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-3">Top Incident Types</h3>
                  <div className="flex flex-wrap gap-2">
                    {dashboard.topIncidentTypes.map((t: any) => (
                      <span key={t.type} className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
                        {t.type.replace(/_/g, ' ')} · {t.count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-800">
            {(['cameras', 'incidents'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  tab === t ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-500 hover:text-gray-300'
                }`}>
                {t} {t === 'cameras' ? `(${cameras.length})` : `(${incidents.length})`}
              </button>
            ))}
          </div>

          {/* Cameras grid */}
          {tab === 'cameras' && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cameras.length === 0 && (
                <div className="col-span-full rounded-xl border border-gray-800 p-8 text-center">
                  <Camera className="h-10 w-10 text-gray-700 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No cameras registered for {selectedVessel?.name}</p>
                </div>
              )}
              {cameras.map((cam: any) => (
                <div key={cam.id} className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{cam.name}</p>
                      <p className="text-xs text-gray-500">{cam.cameraCode} · {cam.zone.replace('_', ' ')}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CAM_STATUS_COLOR[cam.status] ?? 'bg-gray-700 text-gray-300'}`}>
                      {cam.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{cam.location}</p>
                  {cam.lastPingAt && (
                    <p className="text-xs text-gray-600">Last ping: {new Date(cam.lastPingAt).toLocaleString()}</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => pingCamera({ variables: { id: cam.id } })}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300">
                      <CheckCircle className="h-3 w-3" /> Ping
                    </button>
                    {cam.streamUrl && (
                      <a href={cam.streamUrl} target="_blank" rel="noreferrer"
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400">
                        <Video className="h-3 w-3" /> Stream
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Incidents table */}
          {tab === 'incidents' && (
            <div className="rounded-xl border border-gray-800 overflow-hidden">
              {incidents.length === 0 ? (
                <div className="p-8 text-center">
                  <Shield className="h-10 w-10 text-gray-700 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No incidents recorded — vessel is safe</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-900 text-gray-500 text-xs uppercase tracking-wide">
                    <tr>
                      {['Type', 'Severity', 'Status', 'Location', 'Detected', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {incidents.map((inc: any) => (
                      <tr key={inc.id} className="hover:bg-gray-900/50 transition-colors">
                        <td className="px-4 py-3 text-gray-200 font-medium">{inc.incidentType.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEV_COLOR[inc.severity] ?? 'bg-gray-700 text-gray-300'}`}>
                            {inc.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[inc.status] ?? 'bg-gray-700 text-gray-300'}`}>
                            {inc.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{inc.location}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                          {new Date(inc.detectedAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {inc.status === 'open' && (
                              <button onClick={() => ackIncident({ variables: { id: inc.id, acknowledgedBy: 'Officer' } })}
                                className="px-2 py-1 text-xs bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 rounded text-yellow-400">
                                Ack
                              </button>
                            )}
                            {(inc.status === 'open' || inc.status === 'acknowledged') && (
                              <button onClick={() => resolveIncident({ variables: { id: inc.id, resolvedBy: 'Officer', resolution: 'Resolved by officer' } })}
                                className="px-2 py-1 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded text-emerald-400">
                                Resolve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}

      {showRegister && vesselId && (
        <RegisterCameraModal
          vesselId={vesselId}
          onClose={() => setShowRegister(false)}
          onDone={() => { refetchCams(); refetchDash(); }}
        />
      )}
      {showReport && vesselId && (
        <ReportIncidentModal
          vesselId={vesselId}
          onClose={() => setShowReport(false)}
          onDone={() => { refetchInc(); refetchDash(); }}
        />
      )}
    </div>
  );
}
