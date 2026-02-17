import { useQuery, gql } from '@apollo/client';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

const EUA_HISTORY = gql`
  query EuaPriceHistory($days: Int) {
    euaPriceHistory(days: $days) { priceEur recordedAt source }
    carbonPrices { euEtsEur source updatedAt }
  }
`;

interface Props { days?: number }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400">{new Date(label).toLocaleDateString()}</p>
      <p className="text-white font-bold mt-0.5">
        €{payload[0]?.value?.toFixed(2)}{' '}
        <span className="text-gray-400 font-normal">/ tonne CO₂</span>
      </p>
    </div>
  );
};

export function EuaPriceChart({ days = 90 }: Props) {
  const { data, loading } = useQuery(EUA_HISTORY, { variables: { days } });

  const history: any[] = data?.euaPriceHistory ?? [];
  const current = data?.carbonPrices;

  const prices = history.map((p) => p.priceEur);
  const minP = prices.length ? Math.min(...prices) : 45;
  const maxP = prices.length ? Math.max(...prices) : 85;
  const first = history[0]?.priceEur;
  const last = history[history.length - 1]?.priceEur;
  const change = first && last ? ((last - first) / first) * 100 : 0;
  const trending = change >= 0;

  return (
    <div className="space-y-3">
      {/* Price header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-black text-white">
            €{current?.euEtsEur?.toFixed(2) ?? '—'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">per tonne CO₂ · EU ETS EUA</p>
        </div>
        <div className={`flex items-center gap-1 text-sm font-medium ${trending ? 'text-green-400' : 'text-red-400'}`}>
          {trending ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          {change >= 0 ? '+' : ''}{change.toFixed(1)}% ({days}d)
        </div>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="h-40 flex items-center justify-center text-gray-500 text-sm">
          Loading price data...
        </div>
      ) : history.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-gray-500 text-sm">
          No price history yet — runs every 15 min
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={history} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="euaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="recordedAt"
              tickFormatter={(v) => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
              tick={{ fill: '#6b7280', fontSize: 10 }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[Math.floor(minP * 0.95), Math.ceil(maxP * 1.05)]}
              tick={{ fill: '#6b7280', fontSize: 10 }}
              tickLine={false}
              tickFormatter={(v) => `€${v}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="priceEur"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#euaGrad)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}

      <p className="text-xs text-gray-600 text-right">
        Source: {current?.source ?? '—'} · Updated: {current?.updatedAt
          ? new Date(current.updatedAt).toLocaleTimeString()
          : '—'}
      </p>
    </div>
  );
}
