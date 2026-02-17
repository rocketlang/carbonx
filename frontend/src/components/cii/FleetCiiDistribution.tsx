import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface RatingCount { rating: string; count: number }

const COLORS: Record<string, string> = {
  A: '#10b981',
  B: '#22c55e',
  C: '#eab308',
  D: '#f97316',
  E: '#ef4444',
};

const LABELS: Record<string, string> = {
  A: 'A — Major improvement',
  B: 'B — Minor improvement',
  C: 'C — Moderate',
  D: 'D — Minor deterioration',
  E: 'E — Major deterioration',
};

interface Props {
  data: RatingCount[];
  totalVessels: number;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { rating, count } = payload[0].payload;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold" style={{ color: COLORS[rating] }}>Rating {rating}</p>
      <p className="text-gray-300">{LABELS[rating]}</p>
      <p className="text-white mt-1 font-mono">{count} vessels</p>
    </div>
  );
};

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function FleetCiiDistribution({ data, totalVessels }: Props) {
  const filtered = data.filter((d) => d.count > 0);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={filtered}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={100}
            dataKey="count"
            nameKey="rating"
            paddingAngle={2}
            labelLine={false}
            label={renderCustomLabel}
          >
            {filtered.map((entry) => (
              <Cell key={entry.rating} fill={COLORS[entry.rating] ?? '#6b7280'} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => (
              <span style={{ color: COLORS[value] ?? '#9ca3af', fontSize: 12 }}>
                Rating {value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Centre label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center mt-[-20px]">
          <p className="text-2xl font-black text-white">{totalVessels}</p>
          <p className="text-xs text-gray-500">vessels</p>
        </div>
      </div>
    </div>
  );
}
