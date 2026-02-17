/**
 * Credit Portfolio Charts
 * - Donut by standard (GS, VCS, PlanVivo…)
 * - Bar by vintage year
 * - Horizontal bar by project type
 */
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

const STANDARD_COLORS: Record<string, string> = {
  gold_standard:            '#f59e0b',
  verra_vcs:                '#10b981',
  plan_vivo:                '#3b82f6',
  american_carbon_registry: '#8b5cf6',
  climate_action_reserve:   '#f97316',
};
const STANDARD_LABELS: Record<string, string> = {
  gold_standard:            'Gold Standard',
  verra_vcs:                'Verra VCS',
  plan_vivo:                'Plan Vivo',
  american_carbon_registry: 'ACR',
  climate_action_reserve:   'CAR',
};
const TYPE_LABELS: Record<string, string> = {
  redd_plus:              'REDD+',
  afforestation:          'Afforestation',
  improved_forest:        'Impr. Forest',
  renewable_energy:       'Renewable Energy',
  methane_capture:        'Methane Capture',
  blue_carbon:            'Blue Carbon',
  clean_cookstoves:       'Cookstoves',
  industrial_efficiency:  'Industrial',
  direct_air_capture:     'DAC',
  biochar:                'Biochar',
  enhanced_weathering:    'Weathering',
  ocean_alkalinity:       'Ocean Alkalinity',
};

const TooltipBase = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-white font-bold">{payload[0].name}</p>
      <p className="text-gray-300">{payload[0].value?.toFixed(0)} tCO₂e</p>
    </div>
  );
};

interface Props {
  byStandard: Array<{ standard: string; quantity: number }>;
  byVintage:  Array<{ vintage: number;  quantity: number }>;
  byType:     Array<{ projectType: string; quantity: number }>;
  totalActive: number;
}

export function CreditPortfolioChart({ byStandard, byVintage, byType, totalActive }: Props) {
  const standardData = byStandard.map((d) => ({
    name:  STANDARD_LABELS[d.standard] ?? d.standard,
    value: d.quantity,
    key:   d.standard,
  }));

  const vintageData = byVintage.map((d) => ({ year: d.vintage, quantity: d.quantity }));

  const typeData = [...byType]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8)
    .map((d) => ({
      name: TYPE_LABELS[d.projectType] ?? d.projectType,
      quantity: d.quantity,
    }));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Donut — by standard */}
      <div className="bg-gray-800 rounded-xl p-4">
        <h4 className="text-sm font-medium text-white mb-3">By Standard</h4>
        {standardData.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-gray-600 text-xs">No data</div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie
                  data={standardData}
                  cx="50%" cy="50%"
                  innerRadius={35} outerRadius={55}
                  dataKey="value"
                  nameKey="name"
                >
                  {standardData.map((d, i) => (
                    <Cell key={i} fill={STANDARD_COLORS[d.key] ?? '#6b7280'} />
                  ))}
                </Pie>
                <Tooltip content={<TooltipBase />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1 mt-2">
              {standardData.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ background: STANDARD_COLORS[d.key] ?? '#6b7280' }}
                    />
                    <span className="text-gray-300">{d.name}</span>
                  </div>
                  <span className="text-gray-500">{d.value.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Bar — by vintage */}
      <div className="bg-gray-800 rounded-xl p-4">
        <h4 className="text-sm font-medium text-white mb-3">By Vintage Year</h4>
        {vintageData.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-gray-600 text-xs">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={vintageData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis
                dataKey="year"
                tick={{ fill: '#6b7280', fontSize: 9 }}
                tickLine={false}
              />
              <YAxis tick={{ fill: '#6b7280', fontSize: 9 }} tickLine={false} />
              <Tooltip
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <div className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs">
                      <p className="text-white">{payload[0].payload.year}</p>
                      <p className="text-emerald-400">{payload[0].value?.toFixed(0)} tCO₂e</p>
                    </div>
                  ) : null
                }
              />
              <Bar dataKey="quantity" fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Horizontal bar — by type */}
      <div className="bg-gray-800 rounded-xl p-4">
        <h4 className="text-sm font-medium text-white mb-3">By Project Type</h4>
        {typeData.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-gray-600 text-xs">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={typeData}
              layout="vertical"
              margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              barSize={10}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 9 }} tickLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: '#9ca3af', fontSize: 9 }}
                tickLine={false}
                width={72}
              />
              <Tooltip
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <div className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs">
                      <p className="text-white">{payload[0].payload.name}</p>
                      <p className="text-blue-400">{payload[0].value?.toFixed(0)} tCO₂e</p>
                    </div>
                  ) : null
                }
              />
              <Bar dataKey="quantity" fill="#3b82f6" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
