/**
 * FuelEU Compliance Table — per-vessel obligations
 */
import { useQuery, useMutation, gql } from '@apollo/client';
import { CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { GhgIntensityGauge, FuelEuStatusBadge } from './GhgIntensityGauge.js';

const FUELEU_RECORDS = gql`
  query FuelEuRecords($year: Int!) {
    fuelEuRecords(year: $year) {
      id vesselId year
      actualGhgIntensity targetGhgIntensity ghgGap
      totalEnergyMj isCompliant penaltyEur
      poolSurplusMj poolBorrowedMj compliancePct
      vessel { name imo type }
    }
  }
`;

const RECALC = gql`
  mutation CalcFleetFuelEu($year: Int!) {
    calculateFleetFuelEu(year: $year)
  }
`;

interface Props { year: number }

export function FuelEuComplianceTable({ year }: Props) {
  const { data, loading, refetch } = useQuery(FUELEU_RECORDS, { variables: { year } });
  const [recalc, { loading: recalcLoading }] = useMutation(RECALC, {
    variables: { year },
    onCompleted: () => refetch(),
  });

  const records: any[] = data?.fuelEuRecords ?? [];

  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <h3 className="font-semibold text-white">Vessel FuelEU Compliance — {year}</h3>
        <button
          onClick={() => recalc()}
          disabled={recalcLoading}
          className="text-xs px-2.5 py-1 bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded hover:bg-blue-600/30 transition-colors disabled:opacity-50 flex items-center gap-1"
        >
          {recalcLoading
            ? <><RefreshCw className="h-3 w-3 animate-spin" /> Recalculating...</>
            : 'Recalculate all'}
        </button>
      </div>

      {loading ? (
        <div className="py-10 text-center text-gray-500 text-sm">Loading...</div>
      ) : records.length === 0 ? (
        <div className="py-10 text-center text-gray-500 text-sm">
          No FuelEU records for {year} — add voyages and run recalculate
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-xs uppercase tracking-wide text-gray-500">
                <th className="text-left px-4 py-2">Vessel</th>
                <th className="text-right px-4 py-2">Actual</th>
                <th className="text-right px-4 py-2">Target</th>
                <th className="text-left px-4 py-2 min-w-[140px]">GHG Intensity</th>
                <th className="text-center px-4 py-2">Status</th>
                <th className="text-right px-4 py-2">Penalty</th>
                <th className="text-right px-4 py-2">Pool</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/40">
              {records.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-700/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{r.vessel.name}</p>
                    <p className="text-xs text-gray-500">IMO {r.vessel.imo}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    <span className={r.isCompliant ? 'text-green-400' : 'text-red-400'}>
                      {r.actualGhgIntensity?.toFixed(2) ?? '—'}
                    </span>
                    <span className="text-gray-600 ml-1">g</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-blue-400">
                    {r.targetGhgIntensity?.toFixed(2) ?? '—'}
                    <span className="text-gray-600 ml-1">g</span>
                  </td>
                  <td className="px-4 py-3 w-44">
                    {r.actualGhgIntensity != null && r.targetGhgIntensity != null ? (
                      <GhgIntensityGauge
                        actual={r.actualGhgIntensity}
                        target={r.targetGhgIntensity}
                        size="sm"
                      />
                    ) : (
                      <span className="text-xs text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <FuelEuStatusBadge
                      isCompliant={r.isCompliant}
                      ghgGap={r.ghgGap ?? 0}
                    />
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {r.penaltyEur > 0
                      ? <span className="text-red-400">€{(r.penaltyEur / 1000).toFixed(0)}k</span>
                      : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-xs">
                    {r.poolSurplusMj > 0 ? (
                      <span className="text-green-400">+{(r.poolSurplusMj / 1e6).toFixed(1)} TJ</span>
                    ) : r.poolBorrowedMj > 0 ? (
                      <span className="text-orange-400">-{(r.poolBorrowedMj / 1e6).toFixed(1)} TJ</span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Footer totals */}
            <tfoot>
              <tr className="border-t-2 border-gray-700 text-xs text-gray-400 font-medium">
                <td className="px-4 py-2" colSpan={4}>
                  {records.filter((r: any) => r.isCompliant).length} / {records.length} vessels compliant
                </td>
                <td className="px-4 py-2 text-center">
                  {records.every((r: any) => r.isCompliant)
                    ? <span className="flex items-center justify-center gap-1 text-green-400">
                        <CheckCircle className="h-3.5 w-3.5" /> Fleet OK
                      </span>
                    : <span className="flex items-center justify-center gap-1 text-red-400">
                        <AlertCircle className="h-3.5 w-3.5" /> Action needed
                      </span>}
                </td>
                <td className="px-4 py-2 text-right text-red-400">
                  €{(records.reduce((s: number, r: any) => s + r.penaltyEur, 0) / 1000).toFixed(0)}k
                </td>
                <td className="px-4 py-2" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
