import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, gql } from '@apollo/client';
import { ArrowLeft, RefreshCw, Ship, TrendingDown, Calendar } from 'lucide-react';
import { CiiRatingBadge, CiiGaugeBar } from '../components/cii/CiiRatingBadge.js';
import { CiiTrendChart } from '../components/cii/CiiTrendChart.js';
import { CiiSimulator } from '../components/cii/CiiSimulator.js';

const VESSEL_DETAIL = gql`
  query VesselCiiDetail($id: String!) {
    vessel(id: $id) {
      id imo name type flag dwt gt yearBuilt
    }
  }
`;

const CII_TIMELINE = gql`
  query CiiTimeline($vesselId: String!, $fromYear: Int!, $toYear: Int!) {
    vesselCiiTimeline(vesselId: $vesselId, fromYear: $fromYear, toYear: $toYear) {
      year attainedCii requiredCii ciiRatio rating totalDistanceNm totalCo2G dwt
      iceCorrectionApplied shuttleCorrectionApplied yearEndProjection
    }
  }
`;

const VOYAGE_LIST = gql`
  query VesselVoyages($vesselId: String!, $year: Int!) {
    voyages(vesselId: $vesselId, year: $year) {
      id voyageNumber departurePort arrivalPort departureAt distanceNm
      hfoConsumedMt mgoConsumedMt lngConsumedMt co2EmissionsMt status
    }
  }
`;

const CALCULATE_CII = gql`
  mutation CalculateCii($vesselId: String!, $year: Int!) {
    calculateCiiRecord(vesselId: $vesselId, year: $year) {
      year rating ciiRatio attainedCii requiredCii
    }
  }
`;

const CURRENT_YEAR = new Date().getFullYear();

export function VesselCiiDetail() {
  const { vesselId } = useParams<{ vesselId: string }>();
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);

  const { data: vesselData, loading: vesselLoading } = useQuery(VESSEL_DETAIL, {
    variables: { id: vesselId },
    skip: !vesselId,
  });

  const { data: timelineData, loading: timelineLoading, refetch: refetchTimeline } = useQuery(CII_TIMELINE, {
    variables: { vesselId, fromYear: 2023, toYear: CURRENT_YEAR },
    skip: !vesselId,
  });

  const { data: voyageData, loading: voyageLoading } = useQuery(VOYAGE_LIST, {
    variables: { vesselId, year: selectedYear },
    skip: !vesselId,
  });

  const [calculateCii, { loading: calcLoading }] = useMutation(CALCULATE_CII, {
    variables: { vesselId, year: selectedYear },
    onCompleted: () => refetchTimeline(),
  });

  const vessel = vesselData?.vessel;
  const timeline = timelineData?.vesselCiiTimeline ?? [];
  const currentRecord = timeline.find((r: any) => r.year === selectedYear);
  const voyages = voyageData?.voyages ?? [];

  if (vesselLoading) {
    return (
      <div className="p-8 text-center text-gray-500">
        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
        Loading vessel...
      </div>
    );
  }

  if (!vessel) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-400">Vessel not found</p>
        <Link to="/cii" className="text-emerald-400 text-sm mt-2 inline-block">← Back to fleet</Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/cii" className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
          <ArrowLeft className="h-4 w-4 text-gray-400" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">{vessel.name}</h1>
            {currentRecord && <CiiRatingBadge rating={currentRecord.rating} size="md" />}
          </div>
          <p className="text-gray-400 text-sm">
            IMO {vessel.imo} · {vessel.type.replace('_', ' ')} · {vessel.flag} ·{' '}
            {vessel.dwt.toLocaleString()} DWT · Built {vessel.yearBuilt}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200"
          >
            {[2023, 2024, 2025, 2026].filter((y) => y <= CURRENT_YEAR).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={() => calculateCii()}
            disabled={calcLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${calcLoading ? 'animate-spin' : ''}`} />
            Recalculate
          </button>
        </div>
      </div>

      {/* Current year KPIs */}
      {currentRecord && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-xl p-4 flex flex-col items-center justify-center gap-2">
            <CiiRatingBadge rating={currentRecord.rating} size="xl" showLabel />
          </div>
          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">CII Ratio</p>
            <p className="text-2xl font-bold text-white font-mono">
              {currentRecord.ciiRatio?.toFixed(3)}
            </p>
            <CiiGaugeBar ratio={currentRecord.ciiRatio ?? 1} vesselType={vessel.type} />
          </div>
          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Attained CII</p>
            <p className="text-xl font-bold text-white font-mono">
              {currentRecord.attainedCii?.toFixed(4)}
            </p>
            <p className="text-xs text-gray-600 mt-1">gCO₂ / DWT·nm</p>
            <p className="text-xs text-blue-400 mt-0.5">
              Required: {currentRecord.requiredCii?.toFixed(4)}
            </p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Distance / CO₂</p>
            <p className="text-lg font-bold text-white">
              {currentRecord.totalDistanceNm?.toLocaleString()} nm
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {(currentRecord.totalCo2G / 1_000_000_000).toFixed(2)} kt CO₂
            </p>
            {currentRecord.yearEndProjection && (
              <p className="text-xs text-yellow-400 mt-1">
                Projected end: Rating {currentRecord.yearEndProjection}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Trend Chart + Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Multi-year trend chart */}
        <div className="lg:col-span-2 bg-gray-800 rounded-xl p-4">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-blue-400" />
            CII Trend — 2023 to {CURRENT_YEAR}
          </h2>
          {timelineLoading ? (
            <div className="h-64 flex items-center justify-center text-gray-500 text-sm">Loading...</div>
          ) : timeline.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
              No data — calculate CII records first
            </div>
          ) : (
            <CiiTrendChart data={timeline} height={280} />
          )}
        </div>

        {/* What-if simulator */}
        {currentRecord && (
          <CiiSimulator
            vesselId={vesselId!}
            year={selectedYear}
            currentRating={currentRecord.rating ?? 'C'}
          />
        )}
      </div>

      {/* Voyage list */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <h2 className="font-semibold text-white">Voyages — {selectedYear}</h2>
          <span className="text-xs text-gray-500 ml-auto">{voyages.length} voyages</span>
        </div>

        {voyageLoading ? (
          <div className="py-8 text-center text-gray-500 text-sm">Loading voyages...</div>
        ) : voyages.length === 0 ? (
          <div className="py-8 text-center text-gray-500 text-sm">
            No voyages recorded for {selectedYear}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left px-4 py-2 text-gray-500 font-medium uppercase tracking-wide">Voyage</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium uppercase tracking-wide">Route</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium uppercase tracking-wide">Date</th>
                  <th className="text-right px-4 py-2 text-gray-500 font-medium uppercase tracking-wide">Distance</th>
                  <th className="text-right px-4 py-2 text-gray-500 font-medium uppercase tracking-wide">HFO</th>
                  <th className="text-right px-4 py-2 text-gray-500 font-medium uppercase tracking-wide">MGO</th>
                  <th className="text-right px-4 py-2 text-gray-500 font-medium uppercase tracking-wide">CO₂</th>
                  <th className="text-center px-4 py-2 text-gray-500 font-medium uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/40">
                {voyages.map((v: any) => (
                  <tr key={v.id} className="hover:bg-gray-700/20 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-gray-300">{v.voyageNumber}</td>
                    <td className="px-4 py-2.5 text-gray-300">
                      {v.departurePort} → {v.arrivalPort}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {new Date(v.departureAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-300 font-mono">
                      {v.distanceNm.toLocaleString()} nm
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-400 font-mono">
                      {v.hfoConsumedMt > 0 ? `${v.hfoConsumedMt.toFixed(1)}t` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-400 font-mono">
                      {v.mgoConsumedMt > 0 ? `${v.mgoConsumedMt.toFixed(1)}t` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-300 font-mono">
                      {v.co2EmissionsMt.toFixed(1)}t
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        v.status === 'completed'
                          ? 'bg-green-500/15 text-green-400'
                          : v.status === 'verified'
                          ? 'bg-blue-500/15 text-blue-400'
                          : 'bg-gray-700 text-gray-400'
                      }`}>
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
