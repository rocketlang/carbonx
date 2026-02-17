/**
 * Fuel Mix GHG Chart
 * Shows the GHG intensity contribution breakdown by fuel type
 */
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';

const FUEL_LABELS: Record<string, string> = {
  hfo:             'HFO/VLSFO',
  mgo:             'MGO',
  lng_otto:        'LNG (Otto)',
  lng_diesel:      'LNG (Diesel)',
  methanol_fossil: 'Methanol',
  methanol_bio:    'Bio-Methanol',
  bio_lng:         'Bio-LNG',
  biofuel:         'Biofuel',
  ammonia_green:   'Green NH₃',
  h2_green:        'Green H₂',
};

const FUEL_COLORS: Record<string, string> = {
  hfo:             '#ef4444',
  mgo:             '#f97316',
  lng_otto:        '#3b82f6',
  lng_diesel:      '#6366f1',
  methanol_fossil: '#f59e0b',
  methanol_bio:    '#22c55e',
  bio_lng:         '#10b981',
  biofuel:         '#84cc16',
  ammonia_green:   '#06b6d4',
  h2_green:        '#a855f7',
};

interface Breakdown {
  fuelType: string;
  energyMj: number;
  ghgIntensityContrib: number;
  ghgFactor: number;
}

interface Props {
  breakdown: Breakdown[];
  actualGhgIntensity: number;
  targetGhgIntensity: number;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as Breakdown;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-white font-bold">{FUEL_LABELS[d.fuelType] ?? d.fuelType}</p>
      <p className="text-gray-400 mt-0.5">WtW factor: {d.ghgFactor.toFixed(1)} gCO₂eq/MJ</p>
      <p className="text-gray-300">Contribution: {d.ghgIntensityContrib.toFixed(2)} gCO₂eq/MJ</p>
      <p className="text-gray-500">Energy: {(d.energyMj / 1_000).toFixed(0)} GJ</p>
    </div>
  );
};

export function FuelMixChart({ breakdown, actualGhgIntensity, targetGhgIntensity }: Props) {
  if (!breakdown?.length) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
        No fuel data available
      </div>
    );
  }

  const sorted = [...breakdown].sort((a, b) => b.ghgIntensityContrib - a.ghgIntensityContrib);

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">GHG intensity contribution by fuel (gCO₂eq/MJ)</p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart
          data={sorted}
          margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
          layout="vertical"
          barSize={14}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickLine={false}
            tickFormatter={(v) => `${v}`}
          />
          <YAxis
            type="category"
            dataKey="fuelType"
            tick={{ fill: '#9ca3af', fontSize: 9 }}
            tickLine={false}
            tickFormatter={(v: string) => FUEL_LABELS[v] ?? v}
            width={72}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="ghgIntensityContrib" radius={[0, 3, 3, 0]}>
            {sorted.map((entry, i) => (
              <Cell key={i} fill={FUEL_COLORS[entry.fuelType] ?? '#6b7280'} opacity={0.85} />
            ))}
          </Bar>
          {/* Actual GHG line */}
          <ReferenceLine
            x={actualGhgIntensity}
            stroke="#f97316"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            label={{ value: 'Actual', fill: '#f97316', fontSize: 9, position: 'top' }}
          />
          {/* Target line */}
          <ReferenceLine
            x={targetGhgIntensity}
            stroke="#3b82f6"
            strokeWidth={1.5}
            label={{ value: 'Target', fill: '#3b82f6', fontSize: 9, position: 'insideTopRight' }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
