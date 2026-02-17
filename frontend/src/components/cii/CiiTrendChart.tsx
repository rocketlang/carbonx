import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';

interface CiiYear {
  year: number;
  attainedCii: number | null;
  requiredCii: number | null;
  ciiRatio: number | null;
  rating: string | null;
}

const RATING_COLORS: Record<string, string> = {
  A: '#10b981',
  B: '#22c55e',
  C: '#eab308',
  D: '#f97316',
  E: '#ef4444',
};

interface Props {
  data: CiiYear[];
  height?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-xl text-xs space-y-1">
      <p className="font-semibold text-white text-sm">{label}</p>
      <p className="text-gray-400">
        Attained CII: <span className="text-white font-mono">{d.attainedCii?.toFixed(4)}</span>
      </p>
      <p className="text-gray-400">
        Required CII: <span className="text-blue-300 font-mono">{d.requiredCii?.toFixed(4)}</span>
      </p>
      <p className="text-gray-400">
        Ratio: <span className="font-mono" style={{ color: RATING_COLORS[d.rating] ?? '#fff' }}>
          {d.ciiRatio?.toFixed(3)}
        </span>
      </p>
      {d.rating && (
        <p className="text-gray-400">
          Rating: <span className="font-bold" style={{ color: RATING_COLORS[d.rating] }}>{d.rating}</span>
        </p>
      )}
    </div>
  );
};

export function CiiTrendChart({ data, height = 260 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="year" tick={{ fill: '#9ca3af', fontSize: 12 }} />
        <YAxis
          yAxisId="cii"
          orientation="left"
          tick={{ fill: '#9ca3af', fontSize: 11 }}
          label={{ value: 'CII (gCO₂/DWT·nm)', angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 10 }}
        />
        <YAxis
          yAxisId="ratio"
          orientation="right"
          domain={[0, 1.8]}
          tick={{ fill: '#9ca3af', fontSize: 11 }}
          label={{ value: 'Ratio', angle: 90, position: 'insideRight', fill: '#6b7280', fontSize: 10 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12, color: '#9ca3af' }}
          formatter={(value) => value}
        />

        {/* Required CII line (blue reference) */}
        <Line
          yAxisId="cii"
          type="monotone"
          dataKey="requiredCii"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={false}
          name="Required CII"
        />

        {/* Attained CII bars — color by rating */}
        <Bar yAxisId="cii" dataKey="attainedCii" name="Attained CII" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={RATING_COLORS[entry.rating ?? 'C'] ?? '#6b7280'}
              fillOpacity={0.8}
            />
          ))}
        </Bar>

        {/* C/D boundary line */}
        <ReferenceLine
          yAxisId="ratio"
          y={1.0}
          stroke="#6b7280"
          strokeDasharray="4 4"
          label={{ value: 'C/D', fill: '#6b7280', fontSize: 10 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
