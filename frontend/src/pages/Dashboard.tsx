import { useQuery, gql } from '@apollo/client';
import { Ship, Leaf, AlertTriangle, TrendingDown, Euro } from 'lucide-react';

const FLEET_OVERVIEW = gql`
  query FleetCarbonOverview($year: Int!) {
    fleetCiiDashboard(year: $year) {
      totalVessels
      avgCiiRatio
      atRiskCount
      ratingDistribution { rating count }
    }
  }
`;

const RATING_COLORS: Record<string, string> = {
  A: 'bg-emerald-500',
  B: 'bg-green-400',
  C: 'bg-yellow-400',
  D: 'bg-orange-400',
  E: 'bg-red-500',
};

export function Dashboard() {
  const year = new Date().getFullYear();
  const { data, loading } = useQuery(FLEET_OVERVIEW, { variables: { year } });

  if (loading) return <div className="p-8 text-gray-400">Loading fleet carbon data...</div>;

  const dashboard = data?.fleetCiiDashboard;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Fleet Carbon Overview</h1>
        <p className="text-gray-400 mt-1">CII · EU ETS · FuelEU compliance — {year}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard
          icon={<Ship className="h-5 w-5" />}
          label="Tracked Vessels"
          value={dashboard?.totalVessels ?? 0}
          color="blue"
        />
        <KpiCard
          icon={<TrendingDown className="h-5 w-5" />}
          label="Avg CII Ratio"
          value={dashboard?.avgCiiRatio?.toFixed(2) ?? '—'}
          subtitle="< 1.0 = compliant"
          color="green"
        />
        <KpiCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="At Risk (D/E)"
          value={dashboard?.atRiskCount ?? 0}
          color="red"
        />
        <KpiCard
          icon={<Euro className="h-5 w-5" />}
          label="ETS Exposure"
          value="—"
          subtitle="Configure ETS account"
          color="yellow"
        />
      </div>

      {/* CII Rating Distribution */}
      {dashboard?.ratingDistribution && (
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Leaf className="h-5 w-5 text-green-400" />
            CII Rating Distribution — {year}
          </h2>
          <div className="flex gap-3">
            {dashboard.ratingDistribution.map(({ rating, count }: { rating: string; count: number }) => (
              <div key={rating} className="flex-1 text-center">
                <div className={`${RATING_COLORS[rating] ?? 'bg-gray-500'} rounded-lg p-4 mb-2`}>
                  <span className="text-2xl font-bold text-white">{count}</span>
                </div>
                <span className="text-sm text-gray-400">Rating {rating}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  subtitle,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  color: 'blue' | 'green' | 'red' | 'yellow';
}) {
  const colorClass = {
    blue: 'text-blue-400 bg-blue-400/10',
    green: 'text-green-400 bg-green-400/10',
    red: 'text-red-400 bg-red-400/10',
    yellow: 'text-yellow-400 bg-yellow-400/10',
  }[color];

  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <div className={`inline-flex p-2 rounded-lg ${colorClass} mb-3`}>{icon}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-gray-400 mt-1">{label}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>}
    </div>
  );
}
