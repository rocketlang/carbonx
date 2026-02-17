import { useState } from 'react';
import { useQuery, gql } from '@apollo/client';
import {
  Euro, AlertTriangle, CheckCircle, Clock, BarChart3, RefreshCw,
} from 'lucide-react';
import { EuaPriceChart } from '../components/ets/EuaPriceChart.js';
import { EtsObligationTable } from '../components/ets/EtsObligationTable.js';
import { EtsCostForecast } from '../components/ets/EtsCostForecast.js';

const FLEET_ETS = gql`
  query FleetEtsDashboard($year: Int!) {
    fleetEtsDashboard(year: $year) {
      year totalVessels totalCo2Mt
      totalObligationMt totalSurrenderedMt totalShortfallMt
      estimatedCostEur euaBalance euaPrice
      surrenderDeadline daysUntilSurrender
      settledVessels phaseInPct
    }
  }
`;

const CURRENT_YEAR = new Date().getFullYear();

export function EtsDashboard() {
  const [year, setYear] = useState(CURRENT_YEAR - 1); // ETS runs on previous-year data for surrender

  const { data, loading, refetch } = useQuery(FLEET_ETS, { variables: { year } });
  const d = data?.fleetEtsDashboard;

  const deadline = d?.surrenderDeadline ? new Date(d.surrenderDeadline) : null;
  const daysLeft = d?.daysUntilSurrender ?? 0;
  const deadlineSeverity =
    daysLeft <= 14 ? 'red' : daysLeft <= 30 ? 'orange' : daysLeft <= 60 ? 'yellow' : 'green';

  const years = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR].filter((y) => y >= 2024);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Euro className="h-6 w-6 text-blue-400" />
            EU ETS Dashboard
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            EU Emissions Trading System — Directive 2003/87/EC
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={() => refetch()}
            className="p-2 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Deadline banner */}
      {d && daysLeft >= 0 && (
        <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
          deadlineSeverity === 'red'    ? 'bg-red-500/10 border-red-500/30 text-red-300'
          : deadlineSeverity === 'orange' ? 'bg-orange-500/10 border-orange-500/30 text-orange-300'
          : deadlineSeverity === 'yellow' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
          : 'bg-green-500/10 border-green-500/30 text-green-300'
        }`}>
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div className="flex-1">
            <span className="font-semibold">EUA Surrender Deadline: </span>
            {deadline?.toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })}
            {' '}—{' '}
            <span className="font-bold">{daysLeft} days remaining</span>
          </div>
          <span className="text-xs opacity-70">
            {d.phaseInPct}% phase-in ({year})
          </span>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<BarChart3 className="h-5 w-5" />}
          label="Total CO₂ Obligation"
          value={loading ? '—' : `${(d?.totalObligationMt ?? 0).toFixed(0)} EUA`}
          subtitle={loading ? '' : `${(d?.totalCo2Mt ?? 0).toFixed(0)} t total CO₂`}
          color="blue"
        />
        <KpiCard
          icon={<CheckCircle className="h-5 w-5" />}
          label="EUAs Surrendered"
          value={loading ? '—' : `${(d?.totalSurrenderedMt ?? 0).toFixed(0)}`}
          subtitle={loading ? '' : `${d?.settledVessels ?? 0} of ${d?.totalVessels ?? 0} vessels settled`}
          color={d?.settledVessels === d?.totalVessels && d?.totalVessels > 0 ? 'green' : 'gray'}
        />
        <KpiCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Shortfall"
          value={loading ? '—' : `${(d?.totalShortfallMt ?? 0).toFixed(0)} EUA`}
          subtitle={loading ? '' : `≈ €${((d?.totalShortfallMt ?? 0) * (d?.euaPrice ?? 65)).toFixed(0)} est. cost`}
          color={(d?.totalShortfallMt ?? 0) > 0 ? 'red' : 'green'}
        />
        <KpiCard
          icon={<Clock className="h-5 w-5" />}
          label="Account Balance"
          value={loading ? '—' : `${(d?.euaBalance ?? 0).toFixed(0)} EUA`}
          subtitle={loading ? '' : `@ €${(d?.euaPrice ?? 0).toFixed(2)}/t`}
          color={
            (d?.euaBalance ?? 0) >= (d?.totalShortfallMt ?? 0) ? 'green' : 'red'
          }
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* EUA Price Chart */}
        <div className="bg-gray-800 rounded-xl p-4">
          <h3 className="font-semibold text-white text-sm mb-3">EUA Market Price</h3>
          <EuaPriceChart days={90} />
        </div>

        {/* Cost Forecast */}
        <div className="lg:col-span-2">
          <EtsCostForecast year={year} euaPrice={d?.euaPrice ?? 65} />
        </div>
      </div>

      {/* Obligation Table */}
      <EtsObligationTable year={year} euaPrice={d?.euaPrice ?? 65} />

      {/* Regulatory note */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 text-xs text-gray-500 space-y-1">
        <p className="font-medium text-gray-400">EU ETS Phase-in Schedule for Shipping</p>
        <div className="flex flex-wrap gap-4 mt-1">
          <span>2024 — <span className="text-white">40%</span> obligation</span>
          <span>2025 — <span className="text-white">70%</span> obligation</span>
          <span>2026+ — <span className="text-white">100%</span> obligation</span>
        </div>
        <p className="text-gray-600 mt-1">
          EU–EU voyages: 100% applicable · EU–non-EU voyages: 50% applicable ·
          Vessels &gt;5,000 GT engaged in international voyages.
        </p>
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
  color: 'blue' | 'green' | 'red' | 'gray' | 'orange';
}) {
  const colorClass = {
    blue:   'text-blue-400 bg-blue-400/10',
    green:  'text-green-400 bg-green-400/10',
    red:    'text-red-400 bg-red-400/10',
    gray:   'text-gray-400 bg-gray-400/10',
    orange: 'text-orange-400 bg-orange-400/10',
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
