/**
 * Carbon Credits Browser
 * Filterable table of all credits with retire/list actions
 */
import { useState } from 'react';
import { useQuery, gql } from '@apollo/client';
import { ExternalLink, Leaf } from 'lucide-react';

const CREDITS = gql`
  query CarbonCredits($status: String $standard: String $projectType: String) {
    carbonCredits(status: $status standard: $standard projectType: $projectType) {
      id standard projectId projectName projectType country vintage
      quantity priceUsd totalValueUsd status retiredAt retiredFor
      registryUrl serialNumber
    }
  }
`;

const STANDARD_LABELS: Record<string, string> = {
  gold_standard:            'Gold Standard',
  verra_vcs:                'Verra VCS',
  plan_vivo:                'Plan Vivo',
  american_carbon_registry: 'ACR',
  climate_action_reserve:   'CAR',
};
const STANDARD_COLORS: Record<string, string> = {
  gold_standard:            'bg-amber-500/15 text-amber-400 border-amber-500/20',
  verra_vcs:                'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  plan_vivo:                'bg-blue-500/15 text-blue-400 border-blue-500/20',
  american_carbon_registry: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  climate_action_reserve:   'bg-orange-500/15 text-orange-400 border-orange-500/20',
};
const STATUS_COLORS: Record<string, string> = {
  active:   'text-green-400',
  retired:  'text-gray-500',
  for_sale: 'text-blue-400',
  cancelled:'text-red-500',
};
const TYPE_LABELS: Record<string, string> = {
  redd_plus: 'REDD+', afforestation: 'Afforestation', improved_forest: 'Impr. Forest',
  renewable_energy: 'Renewable', methane_capture: 'Methane', blue_carbon: 'Blue Carbon',
  clean_cookstoves: 'Cookstoves', direct_air_capture: 'DAC', biochar: 'Biochar',
};

interface Props {
  onRetire: (credit: any) => void;
}

export function CreditsBrowser({ onRetire }: Props) {
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStandard, setFilterStandard] = useState('');

  const { data, loading, refetch } = useQuery(CREDITS, {
    variables: {
      status:   filterStatus   || undefined,
      standard: filterStandard || undefined,
    },
  });

  const credits: any[] = data?.carbonCredits ?? [];

  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-gray-700 flex flex-wrap items-center gap-3">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Leaf className="h-4 w-4 text-emerald-400" />
          Credit Portfolio
        </h3>
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="retired">Retired</option>
            <option value="for_sale">For Sale</option>
          </select>
          <select
            value={filterStandard}
            onChange={(e) => setFilterStandard(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none"
          >
            <option value="">All Standards</option>
            {Object.entries(STANDARD_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-10 text-center text-gray-500 text-sm">Loading portfolio...</div>
      ) : credits.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-gray-500 text-sm">No credits found</p>
          <p className="text-gray-600 text-xs mt-1">Purchase credits using the form below</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-xs uppercase tracking-wide text-gray-500">
                <th className="text-left px-4 py-2">Project</th>
                <th className="text-center px-4 py-2">Standard</th>
                <th className="text-center px-4 py-2">Type</th>
                <th className="text-right px-4 py-2">Vintage</th>
                <th className="text-right px-4 py-2">Qty (tCO₂e)</th>
                <th className="text-right px-4 py-2">Value</th>
                <th className="text-center px-4 py-2">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/40">
              {credits.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-700/20 transition-colors group">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white text-sm">{c.projectName}</p>
                    <p className="text-xs text-gray-500">{c.country} · #{c.projectId}</p>
                    {c.serialNumber && (
                      <p className="text-xs text-gray-600 font-mono">{c.serialNumber}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full border font-medium ${
                      STANDARD_COLORS[c.standard] ?? 'bg-gray-700 text-gray-400 border-gray-600'
                    }`}>
                      {STANDARD_LABELS[c.standard] ?? c.standard}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-400">
                    {TYPE_LABELS[c.projectType] ?? c.projectType}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-gray-300">
                    {c.vintage}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    <span className={c.status === 'active' ? 'text-white' : 'text-gray-500'}>
                      {c.quantity.toFixed(0)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {c.totalValueUsd != null
                      ? <span className="text-emerald-400">${c.totalValueUsd.toFixed(0)}</span>
                      : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className={`text-xs font-medium capitalize ${STATUS_COLORS[c.status] ?? 'text-gray-400'}`}>
                        {c.status.replace('_', ' ')}
                      </span>
                      {c.retiredAt && (
                        <span className="text-xs text-gray-600">
                          {new Date(c.retiredAt).toLocaleDateString()}
                        </span>
                      )}
                      {c.retiredFor && (
                        <span className="text-xs text-gray-600 truncate max-w-[100px]" title={c.retiredFor}>
                          {c.retiredFor}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      {c.registryUrl && (
                        <a
                          href={c.registryUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-gray-600 hover:text-blue-400 transition-colors"
                          title="View in registry"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {c.status === 'active' && (
                        <button
                          onClick={() => onRetire(c)}
                          className="text-xs px-2 py-1 bg-red-600/20 text-red-400 border border-red-600/30 rounded hover:bg-red-600/30 transition-colors whitespace-nowrap"
                        >
                          Retire
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
