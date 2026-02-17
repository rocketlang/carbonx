import { useQuery, gql } from '@apollo/client';
import { AlertTriangle, AlertCircle, Ship } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CiiRatingBadge } from './CiiRatingBadge.js';

const AT_RISK = gql`
  query AtRiskVessels($year: Int!) {
    atRiskVessels(year: $year) {
      vesselId name imo rating ciiRatio consecutiveDYears
    }
  }
`;

interface Props { year: number }

export function AtRiskVesselsPanel({ year }: Props) {
  const { data, loading } = useQuery(AT_RISK, { variables: { year } });
  const vessels = data?.atRiskVessels ?? [];

  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-400" />
          At-Risk Vessels
          {vessels.length > 0 && (
            <span className="ml-1 bg-orange-500/15 text-orange-400 text-xs font-bold px-1.5 py-0.5 rounded">
              {vessels.length}
            </span>
          )}
        </h3>
        <span className="text-xs text-gray-500">{year}</span>
      </div>

      {loading ? (
        <div className="px-4 py-6 text-center text-gray-500 text-sm">Loading...</div>
      ) : vessels.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <div className="text-2xl mb-2">✅</div>
          <p className="text-sm text-gray-400">No D/E rated vessels</p>
          <p className="text-xs text-gray-600 mt-0.5">All vessels are rated A–C</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-700/50">
          {vessels.map((v: any) => (
            <Link
              key={v.vesselId}
              to={`/cii/${v.vesselId}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700/40 transition-colors group"
            >
              <CiiRatingBadge rating={v.rating} size="sm" />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate group-hover:text-emerald-400 transition-colors">
                  {v.name}
                </p>
                <p className="text-xs text-gray-500">
                  IMO {v.imo} · Ratio {v.ciiRatio.toFixed(3)}
                </p>
              </div>

              <div className="text-right shrink-0">
                {v.rating === 'E' ? (
                  <span className="flex items-center gap-1 text-xs text-red-400 font-medium">
                    <AlertCircle className="h-3 w-3" />
                    Rectify now
                  </span>
                ) : v.consecutiveDYears >= 2 ? (
                  <span className="text-xs text-orange-400 font-medium">
                    {v.consecutiveDYears + 1} yrs D
                  </span>
                ) : (
                  <span className="text-xs text-orange-400">Action needed</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
