import { useQuery, gql } from '@apollo/client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

const FORECAST = gql`
  query EtsCostForecast($year: Int!) {
    etsCostForecast(year: $year) {
      ytdObligationMt projectedObligationMt projectedCostEur euaPrice
    }
  }
`;

interface Props { year: number; euaPrice: number }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400">{label}</p>
      <p className="text-white font-bold mt-0.5">
        {payload[0]?.value?.toFixed(0)} <span className="text-gray-400 font-normal">EUA (tCO₂)</span>
      </p>
    </div>
  );
};

export function EtsCostForecast({ year, euaPrice }: Props) {
  const { data, loading } = useQuery(FORECAST, { variables: { year } });
  const forecast = data?.etsCostForecast;

  const chartData = forecast
    ? [
        { label: 'YTD Actual', value: forecast.ytdObligationMt, actual: true },
        { label: 'Full Year Est.', value: forecast.projectedObligationMt, actual: false },
      ]
    : [];

  const coverageRatio =
    forecast && forecast.projectedObligationMt > 0
      ? (forecast.ytdObligationMt / forecast.projectedObligationMt) * 100
      : 0;

  return (
    <div className="bg-gray-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white text-sm flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4 text-orange-400" />
          Full-Year ETS Forecast — {year}
        </h3>
        {forecast && (
          <span className="text-xs text-gray-500">
            EUA @ €{euaPrice.toFixed(2)}/t
          </span>
        )}
      </div>

      {loading ? (
        <div className="h-36 flex items-center justify-center text-gray-500 text-sm">
          Loading forecast...
        </div>
      ) : !forecast ? (
        <div className="h-36 flex items-center justify-center text-gray-500 text-sm">
          No ETS data — run fleet calculation first
        </div>
      ) : (
        <>
          {/* Metrics row */}
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="bg-gray-700/40 rounded-lg p-2.5">
              <p className="text-gray-500">YTD Obligation</p>
              <p className="text-white font-mono font-bold mt-0.5 text-sm">
                {forecast.ytdObligationMt.toFixed(0)}
                <span className="text-gray-500 font-normal"> EUA</span>
              </p>
            </div>
            <div className="bg-gray-700/40 rounded-lg p-2.5">
              <p className="text-gray-500">Projected Full Year</p>
              <p className="text-orange-300 font-mono font-bold mt-0.5 text-sm">
                {forecast.projectedObligationMt.toFixed(0)}
                <span className="text-gray-500 font-normal"> EUA</span>
              </p>
            </div>
            <div className="bg-gray-700/40 rounded-lg p-2.5">
              <p className="text-gray-500">Est. Total Cost</p>
              <p className="text-red-400 font-mono font-bold mt-0.5 text-sm">
                €{(forecast.projectedCostEur / 1_000).toFixed(0)}k
              </p>
            </div>
          </div>

          {/* Bar chart */}
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 10 }}
                tickLine={false}
                tickFormatter={(v) => `${v}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.actual ? '#3b82f6' : '#f97316'}
                    opacity={0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Year coverage progress */}
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>YTD coverage</span>
              <span>{coverageRatio.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${Math.min(100, coverageRatio)}%` }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
