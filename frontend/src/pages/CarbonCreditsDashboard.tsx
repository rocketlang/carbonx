import { useState } from 'react';
import { useQuery, gql } from '@apollo/client';
import { Award, Leaf, DollarSign, TrendingUp, Flame, BarChart3, RefreshCw } from 'lucide-react';
import { CreditPortfolioChart } from '../components/credits/CreditPortfolioChart.js';
import { CreditsBrowser } from '../components/credits/CreditsBrowser.js';
import { RetireModal } from '../components/credits/RetireModal.js';
import { PurchaseForm } from '../components/credits/PurchaseForm.js';

const PORTFOLIO = gql`
  query CreditPortfolio {
    creditPortfolio {
      totalActive totalRetired totalForSale avgPriceUsd portfolioValueUsd
      byStandard { standard quantity }
      byVintage  { vintage  quantity }
      byType     { projectType quantity }
    }
  }
`;

const NET_POSITION = gql`
  query NetOffsetPosition($year: Int!) {
    netOffsetPosition(year: $year) {
      totalCreditsAvail etsShortfallMt fuelEuPenaltyEur
      atRiskCiiVessels coverageRatio netPosition
    }
  }
`;

const CURRENT_YEAR = new Date().getFullYear();

export function CarbonCreditsDashboard() {
  const [retireTarget, setRetireTarget] = useState<any>(null);

  const { data: portData, loading: portLoading, refetch } = useQuery(PORTFOLIO);
  const { data: posData } = useQuery(NET_POSITION, { variables: { year: CURRENT_YEAR } });

  const p = portData?.creditPortfolio;
  const pos = posData?.netOffsetPosition;

  const isNetPositive = pos && pos.netPosition >= 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Award className="h-6 w-6 text-emerald-400" />
            Carbon Credits
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Voluntary Carbon Market — Gold Standard · Verra VCS · Plan Vivo
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="p-2 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4 text-gray-400" />
          </button>
          <PurchaseForm onSuccess={() => refetch()} />
        </div>
      </div>

      {/* Net offset position banner */}
      {pos && (
        <div className={`flex flex-wrap items-center gap-4 rounded-xl px-4 py-3 border ${
          isNetPositive
            ? 'bg-green-500/10 border-green-500/30'
            : 'bg-red-500/10 border-red-500/30'
        }`}>
          <div className="flex items-center gap-2">
            {isNetPositive
              ? <Leaf className="h-5 w-5 text-green-400" />
              : <Flame className="h-5 w-5 text-red-400" />}
            <div>
              <p className={`font-semibold text-sm ${isNetPositive ? 'text-green-300' : 'text-red-300'}`}>
                Net Offset Position: {pos.netPosition >= 0 ? '+' : ''}{pos.netPosition.toFixed(0)} tCO₂e
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                vs {CURRENT_YEAR} ETS shortfall ({pos.etsShortfallMt.toFixed(0)} t) ·{' '}
                {pos.atRiskCiiVessels} CII D/E vessels
              </p>
            </div>
          </div>
          {pos.coverageRatio != null && (
            <div className="ml-auto text-right">
              <p className="text-xs text-gray-500">ETS coverage</p>
              <p className={`font-mono font-bold text-sm ${
                pos.coverageRatio >= 1 ? 'text-green-400' : 'text-red-400'
              }`}>
                {(pos.coverageRatio * 100).toFixed(0)}%
              </p>
            </div>
          )}
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Leaf className="h-5 w-5" />}
          label="Active Credits"
          value={portLoading ? '—' : `${(p?.totalActive ?? 0).toFixed(0)} tCO₂e`}
          subtitle="available for retirement"
          color="emerald"
        />
        <KpiCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Portfolio Value"
          value={portLoading ? '—' : `$${((p?.portfolioValueUsd ?? 0) / 1000).toFixed(0)}k`}
          subtitle={p?.avgPriceUsd ? `avg $${p.avgPriceUsd.toFixed(2)}/t` : ''}
          color="green"
        />
        <KpiCard
          icon={<Flame className="h-5 w-5" />}
          label="Total Retired"
          value={portLoading ? '—' : `${(p?.totalRetired ?? 0).toFixed(0)} tCO₂e`}
          subtitle="permanently cancelled"
          color="gray"
        />
        <KpiCard
          icon={<BarChart3 className="h-5 w-5" />}
          label="For Sale"
          value={portLoading ? '—' : `${(p?.totalForSale ?? 0).toFixed(0)} tCO₂e`}
          subtitle="listed on marketplace"
          color="blue"
        />
      </div>

      {/* Portfolio Charts */}
      {p && (
        <CreditPortfolioChart
          byStandard={p.byStandard}
          byVintage={p.byVintage}
          byType={p.byType}
          totalActive={p.totalActive}
        />
      )}

      {/* Credits browser */}
      <CreditsBrowser onRetire={setRetireTarget} />

      {/* Market standards reference */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            key: 'gold_standard',
            name: 'Gold Standard',
            color: 'amber',
            desc: 'Highest quality standard. Requires SDG co-benefits. Popular for corporate net-zero claims.',
            priceRange: '$15–40/t',
          },
          {
            key: 'verra_vcs',
            name: 'Verra VCS',
            color: 'emerald',
            desc: 'Largest voluntary registry. Issues Verified Carbon Units (VCUs). REDD+, agriculture, renewables.',
            priceRange: '$5–25/t',
          },
          {
            key: 'plan_vivo',
            name: 'Plan Vivo',
            color: 'blue',
            desc: 'Community-based projects. Strong land tenure and local livelihood co-benefits.',
            priceRange: '$12–35/t',
          },
        ].map(({ key, name, color, desc, priceRange }) => (
          <div key={key} className={`bg-gray-800 rounded-xl p-4 border border-gray-700`}>
            <div className="flex items-center justify-between mb-2">
              <h4 className={`font-semibold text-sm text-${color}-400`}>{name}</h4>
              <span className={`text-xs text-${color}-400 font-mono`}>{priceRange}</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
          </div>
        ))}
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
  color: 'emerald' | 'green' | 'blue' | 'gray' | 'red';
}) {
  const colorClass = {
    emerald: 'text-emerald-400 bg-emerald-400/10',
    green:   'text-green-400 bg-green-400/10',
    blue:    'text-blue-400 bg-blue-400/10',
    gray:    'text-gray-400 bg-gray-400/10',
    red:     'text-red-400 bg-red-400/10',
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
