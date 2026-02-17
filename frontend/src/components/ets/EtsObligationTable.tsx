import { useQuery, useMutation, gql } from '@apollo/client';
import { useState } from 'react';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { SurrenderModal } from './SurrenderModal.js';

const ETS_RECORDS = gql`
  query EtsRecords($year: Int!) {
    etsRecords(year: $year) {
      id vesselId year totalCo2Mt obligationMt euaSurrendered
      shortfallMt settledPct isSettled surrenderDeadline
      vessel { name imo type }
      account { id euaBalance }
    }
  }
`;

const RECALC = gql`
  mutation CalcFleetEts($year: Int!) {
    calculateFleetEts(year: $year)
  }
`;

interface Props { year: number; euaPrice: number }

export function EtsObligationTable({ year, euaPrice }: Props) {
  const [surrenderTarget, setSurrenderTarget] = useState<any>(null);
  const { data, loading, refetch } = useQuery(ETS_RECORDS, { variables: { year } });
  const [recalc, { loading: recalcLoading }] = useMutation(RECALC, {
    variables: { year },
    onCompleted: () => refetch(),
  });

  const records: any[] = data?.etsRecords ?? [];

  return (
    <>
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-white">Vessel ETS Obligations — {year}</h3>
          <button
            onClick={() => recalc()}
            disabled={recalcLoading}
            className="text-xs px-2.5 py-1 bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded hover:bg-blue-600/30 transition-colors disabled:opacity-50"
          >
            {recalcLoading ? 'Recalculating...' : 'Recalculate all'}
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center text-gray-500 text-sm">Loading...</div>
        ) : records.length === 0 ? (
          <div className="py-10 text-center text-gray-500 text-sm">
            No ETS records for {year} — create an ETS account and run recalculate
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-xs uppercase tracking-wide text-gray-500">
                  <th className="text-left px-4 py-2">Vessel</th>
                  <th className="text-right px-4 py-2">Total CO₂</th>
                  <th className="text-right px-4 py-2">Obligation</th>
                  <th className="text-right px-4 py-2">Surrendered</th>
                  <th className="text-right px-4 py-2">Shortfall</th>
                  <th className="text-right px-4 py-2">Est. Cost</th>
                  <th className="text-center px-4 py-2">Progress</th>
                  <th className="text-center px-4 py-2">Status</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/40">
                {records.map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-700/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{r.vessel.name}</p>
                      <p className="text-xs text-gray-500">IMO {r.vessel.imo}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300 font-mono text-xs">
                      {r.totalCo2Mt.toFixed(0)} t
                    </td>
                    <td className="px-4 py-3 text-right text-white font-mono text-xs font-medium">
                      {r.obligationMt.toFixed(0)} EUA
                    </td>
                    <td className="px-4 py-3 text-right text-green-400 font-mono text-xs">
                      {r.euaSurrendered.toFixed(0)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      <span className={r.shortfallMt > 0 ? 'text-red-400' : 'text-gray-500'}>
                        {r.shortfallMt.toFixed(0)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-orange-300 font-mono text-xs">
                      {r.shortfallMt > 0
                        ? `€${(r.shortfallMt * euaPrice).toFixed(0)}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-28 mx-auto">
                        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${Math.min(100, r.settledPct)}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 text-center mt-0.5">
                          {r.settledPct.toFixed(0)}%
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.isSettled ? (
                        <span className="flex items-center justify-center gap-1 text-xs text-green-400">
                          <CheckCircle className="h-3.5 w-3.5" /> Settled
                        </span>
                      ) : r.shortfallMt > 0 ? (
                        <span className="flex items-center justify-center gap-1 text-xs text-red-400">
                          <AlertCircle className="h-3.5 w-3.5" /> Shortfall
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1 text-xs text-yellow-400">
                          <Clock className="h-3.5 w-3.5" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {!r.isSettled && r.obligationMt > 0 && (
                        <button
                          onClick={() => setSurrenderTarget(r)}
                          className="text-xs px-2 py-1 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/30 transition-colors whitespace-nowrap"
                        >
                          Surrender
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {surrenderTarget && (
        <SurrenderModal
          record={surrenderTarget}
          euaPrice={euaPrice}
          onClose={() => setSurrenderTarget(null)}
          onSuccess={() => { setSurrenderTarget(null); refetch(); }}
        />
      )}
    </>
  );
}
