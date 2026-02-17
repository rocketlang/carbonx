import { useState } from 'react';
import { useQuery, gql } from '@apollo/client';
import { Fuel, CheckCircle, AlertCircle, TrendingDown, RefreshCw, ZapOff } from 'lucide-react';
import { FuelEuComplianceTable } from '../components/fueleu/FuelEuComplianceTable.js';
import { FuelMixSimulator } from '../components/fueleu/FuelMixSimulator.js';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';

const FLEET_FUELEU = gql`
  query FleetFuelEuDashboard($year: Int!) {
    fleetFuelEuDashboard(year: $year) {
      year totalVessels compliantVessels nonCompliantVessels
      fleetAvgGhgIntensity targetGhgIntensity fleetGhgGap
      totalEnergyMj totalPenaltyEur
      totalPoolSurplusMj totalPoolBorrowedMj
    }
  }
`;

const TARGETS = gql`
  query FuelEuTargets {
    fuelEuTargets { year targetGhgIntensity reductionPct baseline }
  }
`;

const CURRENT_YEAR = new Date().getFullYear();

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400">{label}</p>
      <p className="text-blue-400 font-bold mt-0.5">
        Target: {payload.find((p: any) => p.dataKey === 'targetGhgIntensity')?.value?.toFixed(2)} gCO₂eq/MJ
      </p>
      {payload.find((p: any) => p.dataKey === 'fleetAvg') && (
        <p className="text-orange-400 font-bold">
          Fleet: {payload.find((p: any) => p.dataKey === 'fleetAvg')?.value?.toFixed(2)} gCO₂eq/MJ
        </p>
      )}
    </div>
  );
};

export function FuelEuDashboard() {
  const [year, setYear] = useState(Math.max(2025, CURRENT_YEAR));

  const { data: dashData, loading } = useQuery(FLEET_FUELEU, { variables: { year } });
  const { data: targetsData } = useQuery(TARGETS);

  const d = dashData?.fleetFuelEuDashboard;
  const targets: any[] = targetsData?.fuelEuTargets ?? [];

  // Build trajectory chart data
  const trajectoryData = targets.map((t: any) => ({
    year: t.year,
    targetGhgIntensity: t.targetGhgIntensity,
    reductionPct: t.reductionPct,
    // Show fleet avg only for current year
    fleetAvg: t.year === year && d ? d.fleetAvgGhgIntensity : undefined,
  }));

  const years = [2025, 2026, 2027, 2028, 2029, 2030].filter((y) => y <= CURRENT_YEAR + 2);

  const isFleetCompliant = d && d.fleetGhgGap <= 0;
  const phaseLabel = year >= 2050 ? '-80%' : year >= 2045 ? '-62%' : year >= 2040 ? '-31%'
    : year >= 2035 ? '-14.5%' : year >= 2030 ? '-6%' : '-2%';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Fuel className="h-6 w-6 text-orange-400" />
            FuelEU Maritime Dashboard
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Regulation (EU) 2023/1805 — GHG intensity, effective 1 Jan 2025
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Compliance banner */}
      {d && (
        <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
          isFleetCompliant
            ? 'bg-green-500/10 border-green-500/30 text-green-300'
            : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          {isFleetCompliant
            ? <CheckCircle className="h-5 w-5 shrink-0" />
            : <AlertCircle className="h-5 w-5 shrink-0" />}
          <div className="flex-1">
            <span className="font-semibold">
              {isFleetCompliant ? 'Fleet is FuelEU compliant' : 'Fleet is non-compliant'}
            </span>
            {' — '}
            Fleet avg {d.fleetAvgGhgIntensity.toFixed(2)} gCO₂eq/MJ vs target{' '}
            {d.targetGhgIntensity.toFixed(2)} gCO₂eq/MJ
            {!isFleetCompliant && (
              <span className="ml-2 font-bold">
                (+{d.fleetGhgGap.toFixed(2)} gap)
              </span>
            )}
          </div>
          <span className="text-xs opacity-70">{year} obligation: {phaseLabel}</span>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Fuel className="h-5 w-5" />}
          label="Fleet Avg GHG Intensity"
          value={loading ? '—' : `${(d?.fleetAvgGhgIntensity ?? 0).toFixed(2)}`}
          subtitle="gCO₂eq/MJ (WtW)"
          color="orange"
        />
        <KpiCard
          icon={<TrendingDown className="h-5 w-5" />}
          label={`${year} Target`}
          value={loading ? '—' : `${(d?.targetGhgIntensity ?? 0).toFixed(2)}`}
          subtitle="gCO₂eq/MJ"
          color="blue"
        />
        <KpiCard
          icon={<CheckCircle className="h-5 w-5" />}
          label="Compliant Vessels"
          value={loading ? '—' : `${d?.compliantVessels ?? 0} / ${d?.totalVessels ?? 0}`}
          color={d?.nonCompliantVessels === 0 && (d?.totalVessels ?? 0) > 0 ? 'green' : 'yellow'}
        />
        <KpiCard
          icon={<ZapOff className="h-5 w-5" />}
          label="Est. Annual Penalty"
          value={loading ? '—' : d?.totalPenaltyEur ? `€${(d.totalPenaltyEur / 1000).toFixed(0)}k` : '€0'}
          subtitle={d?.totalPenaltyEur ? '€2,400/t VLSFO-equiv' : 'No penalty'}
          color={d?.totalPenaltyEur > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GHG Trajectory */}
        <div className="bg-gray-800 rounded-xl p-4">
          <h3 className="font-semibold text-white text-sm mb-1">GHG Intensity Reduction Pathway</h3>
          <p className="text-xs text-gray-500 mb-3">Regulation (EU) 2023/1805 — mandatory milestones</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trajectoryData} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis
                dataKey="year"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: '#6b7280', fontSize: 10 }}
                tickLine={false}
                tickFormatter={(v) => `${v}`}
              />
              <Tooltip content={<CustomTooltip />} />
              {/* Baseline */}
              <ReferenceLine
                y={91.16}
                stroke="#6b7280"
                strokeDasharray="4 2"
                label={{ value: '2020 baseline', fill: '#6b7280', fontSize: 9, position: 'insideTopRight' }}
              />
              {/* Target trajectory */}
              <Line
                type="stepAfter"
                dataKey="targetGhgIntensity"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 3 }}
                name="Target"
              />
              {/* Fleet avg dot */}
              <Line
                dataKey="fleetAvg"
                stroke="#f97316"
                strokeWidth={0}
                dot={{ fill: '#f97316', r: 6 }}
                name="Fleet avg"
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-600 text-right mt-1">Orange dot = fleet avg this year</p>
        </div>

        {/* Pooling Summary */}
        <div className="bg-gray-800 rounded-xl p-4 space-y-4">
          <h3 className="font-semibold text-white text-sm">Pooling & Compliance Summary</h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-700/40 rounded-lg p-3">
              <p className="text-xs text-gray-500">Pool Surplus</p>
              <p className="text-green-400 font-mono font-bold text-lg mt-1">
                {loading ? '—' : `${((d?.totalPoolSurplusMj ?? 0) / 1e6).toFixed(1)} TJ`}
              </p>
              <p className="text-xs text-gray-600">available to lend</p>
            </div>
            <div className="bg-gray-700/40 rounded-lg p-3">
              <p className="text-xs text-gray-500">Pool Deficit</p>
              <p className="text-orange-400 font-mono font-bold text-lg mt-1">
                {loading ? '—' : `${((d?.totalPoolBorrowedMj ?? 0) / 1e6).toFixed(1)} TJ`}
              </p>
              <p className="text-xs text-gray-600">borrowed from pool</p>
            </div>
          </div>

          <div className="space-y-2 text-xs text-gray-500">
            <p className="font-medium text-gray-400">Key Compliance Rules</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Applies to vessels ≥5,000 GT on international voyages</li>
              <li>Well-to-Wake (WtW) GHG intensity — includes upstream emissions</li>
              <li>Penalty: <span className="text-white">€2,400</span> per tonne VLSFO-equivalent shortfall</li>
              <li>Compliance pooling: surplus vessels can offset deficit vessels</li>
              <li>Banking/borrowing up to <span className="text-white">2%</span> from adjacent years</li>
            </ul>
          </div>

          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg px-3 py-2 text-xs text-blue-300">
            <span className="font-medium">On-shore Power Supply (OPS):</span> Available from 2030 for container &amp; passenger vessels at EU TEN-T ports. Reduces at-berth GHG.
          </div>
        </div>
      </div>

      {/* Compliance table */}
      <FuelEuComplianceTable year={year} />

      {/* Simulator */}
      <FuelMixSimulator year={year} />

      {/* Regulatory footer */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 text-xs text-gray-500 space-y-1">
        <p className="font-medium text-gray-400">FuelEU Maritime — GHG Intensity Reduction Schedule</p>
        <div className="flex flex-wrap gap-x-6 gap-y-1 mt-1">
          {targets.map((t: any) => (
            <span key={t.year}>
              {t.year} — <span className="text-white">{t.targetGhgIntensity.toFixed(2)} gCO₂eq/MJ</span>
              <span className="text-gray-600 ml-1">(-{t.reductionPct}%)</span>
            </span>
          ))}
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
  color: 'orange' | 'blue' | 'green' | 'yellow' | 'red' | 'gray';
}) {
  const colorClass = {
    orange: 'text-orange-400 bg-orange-400/10',
    blue:   'text-blue-400 bg-blue-400/10',
    green:  'text-green-400 bg-green-400/10',
    yellow: 'text-yellow-400 bg-yellow-400/10',
    red:    'text-red-400 bg-red-400/10',
    gray:   'text-gray-400 bg-gray-400/10',
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
