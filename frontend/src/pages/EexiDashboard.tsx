import { useQuery, gql } from '@apollo/client';
import { ShieldCheck, CheckCircle, AlertCircle, Clock, FileCheck } from 'lucide-react';
import { EexiFleetTable } from '../components/eexi/EexiFleetTable.js';
import { EplSimulator } from '../components/eexi/EplSimulator.js';

const FLEET_STATUS = gql`
  query FleetEexiStatus {
    fleetEexiStatus {
      totalVessels certifiedVessels compliantVessels
      nonCompliantVessels pendingCertification
    }
  }
`;

export function EexiDashboard() {
  const { data, loading } = useQuery(FLEET_STATUS);
  const s = data?.fleetEexiStatus;

  const allCompliant =
    s && s.certifiedVessels === s.totalVessels && s.nonCompliantVessels === 0 && s.totalVessels > 0;
  const hasIssues = s && (s.nonCompliantVessels > 0 || s.pendingCertification > 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
            EEXI Manager
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Energy Efficiency Existing Ship Index — IMO MEPC.333(76), mandatory from Nov 2022
          </p>
        </div>
      </div>

      {/* Status banner */}
      {s && (
        <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
          allCompliant
            ? 'bg-green-500/10 border-green-500/30 text-green-300'
            : s.nonCompliantVessels > 0
              ? 'bg-red-500/10 border-red-500/30 text-red-300'
              : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
        }`}>
          {allCompliant
            ? <CheckCircle className="h-5 w-5 shrink-0" />
            : s.nonCompliantVessels > 0
              ? <AlertCircle className="h-5 w-5 shrink-0" />
              : <Clock className="h-5 w-5 shrink-0" />}
          <div className="flex-1">
            {allCompliant
              ? <><span className="font-semibold">All vessels EEXI certified and compliant</span></>
              : s.nonCompliantVessels > 0
                ? <><span className="font-semibold">{s.nonCompliantVessels} vessel{s.nonCompliantVessels > 1 ? 's' : ''} require Engine Power Limitation</span></>
                : <><span className="font-semibold">{s.pendingCertification} vessel{s.pendingCertification > 1 ? 's' : ''} pending EEXI calculation</span></>
            }
          </div>
          <span className="text-xs opacity-70">
            One-time certification required
          </span>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<ShieldCheck className="h-5 w-5" />}
          label="Total Vessels"
          value={loading ? '—' : (s?.totalVessels ?? 0)}
          color="gray"
        />
        <KpiCard
          icon={<FileCheck className="h-5 w-5" />}
          label="Certified"
          value={loading ? '—' : `${s?.certifiedVessels ?? 0} / ${s?.totalVessels ?? 0}`}
          subtitle={s?.pendingCertification ? `${s.pendingCertification} pending` : 'All certified'}
          color={(s?.certifiedVessels ?? 0) < (s?.totalVessels ?? 0) ? 'yellow' : 'green'}
        />
        <KpiCard
          icon={<CheckCircle className="h-5 w-5" />}
          label="Compliant"
          value={loading ? '—' : (s?.compliantVessels ?? 0)}
          subtitle="no EPL required"
          color={(s?.nonCompliantVessels ?? 0) === 0 && (s?.totalVessels ?? 0) > 0 ? 'green' : 'gray'}
        />
        <KpiCard
          icon={<AlertCircle className="h-5 w-5" />}
          label="EPL Required"
          value={loading ? '—' : (s?.nonCompliantVessels ?? 0)}
          subtitle="engine power limited"
          color={(s?.nonCompliantVessels ?? 0) > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Fleet table */}
      <EexiFleetTable />

      {/* Two-col: simulator + regulation info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* EEXI + EPL Simulator */}
        <EplSimulator />

        {/* Regulation info */}
        <div className="space-y-4">
          {/* What is EEXI */}
          <div className="bg-gray-800 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-white text-sm">About EEXI</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              The Energy Efficiency Existing Ship Index measures a vessel's CO₂ efficiency
              per tonne-nautical mile at reference conditions (75% MCR). Unlike CII, EEXI
              is a <span className="text-white font-medium">one-time certification</span> required
              by the vessel's first annual, intermediate, or renewal survey after 1 January 2023.
            </p>
            <div className="space-y-2 text-xs">
              <p className="text-gray-500 font-medium uppercase tracking-wide">Compliance Options</p>
              <ul className="space-y-1.5 text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">1.</span>
                  <span><span className="text-white">Engine Power Limitation (EPL/SHA)</span> — Seal/limit the fuel pump or install a power management system limiting engine output</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">2.</span>
                  <span><span className="text-white">Fuel switch</span> — Switch to lower-CF fuel (LNG, methanol) to reduce the attained EEXI</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">3.</span>
                  <span><span className="text-white">EEDI-like modifications</span> — Waste heat recovery, improved hull form, etc.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Reference lines table */}
          <div className="bg-gray-800 rounded-xl p-4">
            <h3 className="font-semibold text-white text-sm mb-3">Required EEXI Reduction by Type</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-gray-700">
                  <th className="text-left py-1">Ship Type</th>
                  <th className="text-right py-1">Reduction</th>
                  <th className="text-right py-1">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/40 text-gray-300">
                {[
                  { type: 'Bulk Carrier',   reduction: '20%', ref: '961.79 × DWT^(-0.477)' },
                  { type: 'Tanker',         reduction: '20%', ref: '1218.8 × DWT^(-0.488)' },
                  { type: 'Container',      reduction: '20%', ref: '174.22 × DWT^(-0.201)' },
                  { type: 'Gas/LNG',        reduction: '30%', ref: '2253.7 (flat)' },
                  { type: 'Ro-Ro Cargo',    reduction: '15%', ref: '1405.1 × DWT^(-0.498)' },
                  { type: 'General Cargo',  reduction: '10%', ref: '588.68 × DWT^(-0.389)' },
                  { type: 'Cruise',         reduction: '30%', ref: '930.0 (flat, by GT)' },
                ].map(({ type, reduction, ref }) => (
                  <tr key={type}>
                    <td className="py-1.5">{type}</td>
                    <td className="py-1.5 text-right text-orange-400 font-medium">{reduction}</td>
                    <td className="py-1.5 text-right text-gray-500 font-mono text-xs">{ref}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Regulatory footer */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 text-xs text-gray-500 space-y-1">
        <p className="font-medium text-gray-400">EEXI Formula — MEPC.333(76) Regulation 27</p>
        <p className="font-mono text-gray-600 mt-1">
          Attained EEXI = (CF_ME × SFC_ME × P_ME_75 × f_w) / (Capacity × V_ref)
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-0.5 mt-1">
          <span>P_ME_75 = 0.75 × MCR (kW)</span>
          <span>CF_HFO = 3.1144 · CF_LNG = 2.750</span>
          <span>Speed penalty ∝ EPL^(1/3) (cubic law)</span>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon, label, value, subtitle, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  color: 'emerald' | 'green' | 'yellow' | 'red' | 'gray';
}) {
  const colorClass = {
    emerald: 'text-emerald-400 bg-emerald-400/10',
    green:   'text-green-400 bg-green-400/10',
    yellow:  'text-yellow-400 bg-yellow-400/10',
    red:     'text-red-400 bg-red-400/10',
    gray:    'text-gray-400 bg-gray-400/10',
  }[color];

  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <div className={`inline-flex p-2 rounded-lg ${colorClass} mb-3`}>{icon}</div>
      <div className="text-2xl font-bold text-white truncate">{value}</div>
      <div className="text-sm text-gray-400 mt-0.5">{label}</div>
      {subtitle && <div className="text-xs text-gray-600 mt-0.5">{subtitle}</div>}
    </div>
  );
}
