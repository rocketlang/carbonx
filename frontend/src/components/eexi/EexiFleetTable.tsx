/**
 * EEXI Fleet Certification Table
 */
import { useQuery, gql } from '@apollo/client';
import { FileCheck, Clock } from 'lucide-react';
import { EexiRatioBar, EexiStatusBadge } from './EexiGaugeMeter.js';

const FLEET_EEXI = gql`
  query FleetEexiVessels {
    fleetEexiVessels {
      vesselId vesselName imo vesselType dwt
      attainedEexi requiredEexi isCompliant
      eexiRatio eplPct
      certificateNumber certifiedAt certifiedBy
      enginePowerLimitKw
    }
  }
`;

export function EexiFleetTable() {
  const { data, loading } = useQuery(FLEET_EEXI);
  const vessels: any[] = data?.fleetEexiVessels ?? [];

  const certified = vessels.filter((v: any) => v.attainedEexi != null);
  const pending = vessels.filter((v: any) => v.attainedEexi == null);

  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <FileCheck className="h-4 w-4 text-emerald-400" />
          Fleet EEXI Certification Status
        </h3>
        <span className="text-xs text-gray-500">
          {certified.length} / {vessels.length} certified · mandatory from Nov 2022
        </span>
      </div>

      {loading ? (
        <div className="py-10 text-center text-gray-500 text-sm">Loading...</div>
      ) : vessels.length === 0 ? (
        <div className="py-10 text-center text-gray-500 text-sm">
          No vessels found — add vessels first
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-xs uppercase tracking-wide text-gray-500">
                <th className="text-left px-4 py-2">Vessel</th>
                <th className="text-right px-4 py-2">Attained</th>
                <th className="text-right px-4 py-2">Required</th>
                <th className="text-left px-4 py-2 min-w-[130px]">EEXI Ratio</th>
                <th className="text-center px-4 py-2">Status</th>
                <th className="text-right px-4 py-2">EPL</th>
                <th className="text-left px-4 py-2">Certificate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/40">
              {vessels.map((v: any) => (
                <tr key={v.vesselId} className="hover:bg-gray-700/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{v.vesselName}</p>
                    <p className="text-xs text-gray-500">IMO {v.imo} · {v.vesselType.replace('_', ' ')}</p>
                    <p className="text-xs text-gray-600">{v.dwt.toFixed(0)} DWT</p>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {v.attainedEexi != null
                      ? <span className={v.isCompliant ? 'text-green-400' : 'text-red-400'}>
                          {v.attainedEexi.toFixed(3)}
                        </span>
                      : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-blue-400">
                    {v.requiredEexi != null ? v.requiredEexi.toFixed(3) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <EexiRatioBar ratio={v.eexiRatio} isCompliant={v.isCompliant} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <EexiStatusBadge
                      isCompliant={v.isCompliant}
                      certified={v.attainedEexi != null}
                    />
                  </td>
                  <td className="px-4 py-3 text-right text-xs">
                    {v.eplPct != null
                      ? <span className="text-orange-400 font-mono">{v.eplPct.toFixed(1)}% MCR</span>
                      : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {v.certificateNumber ? (
                      <div>
                        <p className="text-gray-200 font-mono">{v.certificateNumber}</p>
                        {v.certifiedBy && (
                          <p className="text-gray-500">{v.certifiedBy}</p>
                        )}
                        {v.certifiedAt && (
                          <p className="text-gray-600">
                            {new Date(v.certifiedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className={v.attainedEexi != null ? 'text-yellow-600' : 'text-gray-600'}>
                        {v.attainedEexi != null ? 'Cert. pending' : 'Uncertified'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>

            {pending.length > 0 && (
              <tfoot>
                <tr className="border-t border-gray-700">
                  <td colSpan={7} className="px-4 py-2">
                    <div className="flex items-center gap-2 text-xs text-yellow-500">
                      <Clock className="h-3.5 w-3.5" />
                      {pending.length} vessel{pending.length > 1 ? 's' : ''} pending EEXI calculation
                      — use the EEXI Calculator below
                    </div>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
