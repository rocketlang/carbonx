import { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { Link } from 'react-router-dom';
import { Leaf, TrendingDown, AlertTriangle, Award, RefreshCw, ChevronRight } from 'lucide-react';
import { FleetCiiDistribution } from '../components/cii/FleetCiiDistribution.js';
import { CiiRatingBadge, CiiGaugeBar } from '../components/cii/CiiRatingBadge.js';
import { AtRiskVesselsPanel } from '../components/cii/AtRiskVesselsPanel.js';

const FLEET_DASHBOARD = gql`
  query FleetCiiDashboard($year: Int!) {
    fleetCiiDashboard(year: $year) {
      totalVessels avgCiiRatio atRiskCount bestRatedCount
      ratingDistribution { rating count }
    }
  }
`;

const FLEET_SNAPSHOTS = gql`
  query FleetCiiSnapshots($year: Int!) {
    fleetCiiSnapshots(year: $year) {
      vesselId name imo type rating ciiRatio attainedCii requiredCii year
    }
  }
`;

const RECALC_FLEET = gql`
  mutation RecalcFleet($vesselId: String!, $year: Int!) {
    calculateCiiRecord(vesselId: $vesselId, year: $year) { id rating ciiRatio }
  }
`;

const CURRENT_YEAR = new Date().getFullYear();

const RATING_ORDER = { A: 0, B: 1, C: 2, D: 3, E: 4 };

export function CiiDashboard() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [sortBy, setSortBy] = useState<'rating' | 'ratio' | 'name'>('rating');

  const { data: dashData, loading: dashLoading, refetch } = useQuery(FLEET_DASHBOARD, {
    variables: { year },
  });
  const { data: snapData, loading: snapLoading } = useQuery(FLEET_SNAPSHOTS, {
    variables: { year },
  });

  const dashboard = dashData?.fleetCiiDashboard;
  const snapshots = [...(snapData?.fleetCiiSnapshots ?? [])].sort((a: any, b: any) => {
    if (sortBy === 'rating') return (RATING_ORDER[a.rating as keyof typeof RATING_ORDER] ?? 2) - (RATING_ORDER[b.rating as keyof typeof RATING_ORDER] ?? 2);
    if (sortBy === 'ratio') return (b.ciiRatio ?? 0) - (a.ciiRatio ?? 0);
    return a.name.localeCompare(b.name);
  });

  const years = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].filter((y) => y <= CURRENT_YEAR);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Leaf className="h-6 w-6 text-emerald-400" />
            CII Fleet Dashboard
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Carbon Intensity Indicator — IMO MEPC.337(76)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
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

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Leaf className="h-5 w-5" />}
          label="Tracked Vessels"
          value={dashLoading ? '—' : (dashboard?.totalVessels ?? 0)}
          color="emerald"
        />
        <KpiCard
          icon={<TrendingDown className="h-5 w-5" />}
          label="Avg CII Ratio"
          value={dashLoading ? '—' : (dashboard?.avgCiiRatio?.toFixed(3) ?? '—')}
          subtitle="< 1.0 = compliant"
          color={Number(dashboard?.avgCiiRatio) > 1.162 ? 'red' : Number(dashboard?.avgCiiRatio) > 0.795 ? 'yellow' : 'green'}
        />
        <KpiCard
          icon={<Award className="h-5 w-5" />}
          label="A-Rated Vessels"
          value={dashLoading ? '—' : (dashboard?.bestRatedCount ?? 0)}
          subtitle="exceeding IMO target"
          color="green"
        />
        <KpiCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="At Risk (D/E)"
          value={dashLoading ? '—' : (dashboard?.atRiskCount ?? 0)}
          subtitle="need corrective action"
          color={dashboard?.atRiskCount > 0 ? 'red' : 'gray'}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Rating distribution */}
        <div className="bg-gray-800 rounded-xl p-4">
          <h2 className="font-semibold text-white mb-3 text-sm">Rating Distribution</h2>
          {dashLoading ? (
            <div className="h-60 flex items-center justify-center text-gray-500 text-sm">Loading...</div>
          ) : (
            <FleetCiiDistribution
              data={dashboard?.ratingDistribution ?? []}
              totalVessels={dashboard?.totalVessels ?? 0}
            />
          )}
        </div>

        {/* At-risk panel */}
        <div className="lg:col-span-2">
          <AtRiskVesselsPanel year={year} />
        </div>
      </div>

      {/* Vessel Table */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
          <h2 className="font-semibold text-white">All Vessels — CII {year}</h2>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            Sort by:
            {(['rating', 'ratio', 'name'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-2 py-1 rounded transition-colors ${
                  sortBy === s
                    ? 'bg-gray-700 text-white'
                    : 'hover:text-gray-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {snapLoading ? (
          <div className="py-12 text-center text-gray-500 text-sm">Loading vessel data...</div>
        ) : snapshots.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-400 text-sm">No CII records for {year}</p>
            <p className="text-gray-600 text-xs mt-1">
              Add vessels and voyage fuel data, then calculate CII records
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Vessel</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">IMO</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="text-center px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Rating</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">CII Ratio</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Attained</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Required</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {snapshots.map((v: any) => (
                  <tr key={v.vesselId} className="hover:bg-gray-700/30 transition-colors group">
                    <td className="px-4 py-3">
                      <Link
                        to={`/cii/${v.vesselId}`}
                        className="font-medium text-white hover:text-emerald-400 transition-colors"
                      >
                        {v.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{v.imo}</td>
                    <td className="px-4 py-3 text-gray-400 capitalize">{v.type.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-center">
                      <CiiRatingBadge rating={v.rating} size="sm" />
                    </td>
                    <td className="px-4 py-3 w-40">
                      <CiiGaugeBar ratio={v.ciiRatio} vesselType={v.type} />
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-gray-300">
                      {v.attainedCii.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-blue-300">
                      {v.requiredCii.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/cii/${v.vesselId}`}
                        className="text-gray-600 group-hover:text-gray-400 transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  icon, label, value, subtitle, color
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  color: 'emerald' | 'green' | 'yellow' | 'red' | 'gray';
}) {
  const colorClass = {
    emerald: 'text-emerald-400 bg-emerald-400/10',
    green: 'text-green-400 bg-green-400/10',
    yellow: 'text-yellow-400 bg-yellow-400/10',
    red: 'text-red-400 bg-red-400/10',
    gray: 'text-gray-400 bg-gray-400/10',
  }[color];

  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <div className={`inline-flex p-2 rounded-lg ${colorClass} mb-3`}>{icon}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-gray-400 mt-0.5">{label}</div>
      {subtitle && <div className="text-xs text-gray-600 mt-0.5">{subtitle}</div>}
    </div>
  );
}
