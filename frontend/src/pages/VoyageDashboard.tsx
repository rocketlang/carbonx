import { useState } from 'react';
import { useQuery, gql } from '@apollo/client';
import {
  Anchor, Plus, Upload, Filter, RefreshCw,
  Navigation, CloudRain, Waves, TrendingUp
} from 'lucide-react';
import { VoyageTable } from '../components/voyages/VoyageTable.js';
import { VoyageForm, type VoyageRow } from '../components/voyages/VoyageForm.js';
import { CsvImportModal } from '../components/voyages/CsvImportModal.js';
import { ErrorBoundary } from '../components/ErrorBoundary.js';

const CURRENT_YEAR = new Date().getFullYear();

const FLEET_VOYAGES_Q = gql`
  query FleetVoyages($year: Int, $vesselId: String, $status: String) {
    fleetVoyages(year: $year, vesselId: $vesselId, status: $status, limit: 500) {
      id vesselId voyageNumber
      departurePort arrivalPort departurePortCountry arrivalPortCountry
      departureAt arrivalAt distanceNm
      hfoConsumedMt mgoConsumedMt lngConsumedMt methanolConsumedMt biofuelConsumedMt
      co2EmissionsMt etsScope etsCo2Applicable status
      vessel { id name imo }
    }
  }
`;

const STATS_Q = gql`
  query FleetVoyageStats($year: Int!) {
    fleetVoyageStats(year: $year) {
      totalVoyages euVoyages totalDistanceNm totalCo2Mt totalEtsCo2Mt completedCount inProgressCount
    }
  }
`;

const VESSELS_Q = gql`query VoyageDashVessels { vessels { id imo name } }`;

function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${color ?? 'text-gray-400'}`} />
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

const STATUSES = ['','planned','in_progress','completed','verified'];

export function VoyageDashboard() {
  const [year, setYear]           = useState(CURRENT_YEAR);
  const [vesselFilter, setVessel] = useState('');
  const [statusFilter, setStatus] = useState('');
  const [showForm, setShowForm]   = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editVoyage, setEditVoyage] = useState<VoyageRow | null>(null);

  const { data: vesselData } = useQuery(VESSELS_Q);
  const vessels = vesselData?.vessels ?? [];

  const { data, loading, refetch } = useQuery(FLEET_VOYAGES_Q, {
    variables: {
      year,
      vesselId: vesselFilter || undefined,
      status:   statusFilter || undefined,
    },
  });

  const { data: statsData } = useQuery(STATS_Q, { variables: { year } });

  const voyages: VoyageRow[] = data?.fleetVoyages ?? [];
  const stats = statsData?.fleetVoyageStats;

  function handleSaved() { refetch(); }
  function handleDeleted() { refetch(); }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Anchor className="h-6 w-6 text-blue-400" />
            Voyage Manager
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Log fuel consumption, track ETS scope, and trigger compliance recalculations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="h-9 w-9 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-200 text-sm font-medium rounded-lg transition-colors"
          >
            <Upload className="h-4 w-4" /> Import CSV
          </button>
          <button
            onClick={() => { setEditVoyage(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" /> Log Voyage
          </button>
        </div>
      </div>

      {/* KPI row */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <KpiCard
            icon={Navigation}
            label="Total Voyages"
            value={stats.totalVoyages.toLocaleString()}
            sub={`${stats.completedCount} completed · ${stats.inProgressCount} in progress`}
          />
          <KpiCard
            icon={Waves}
            label="EU Voyages"
            value={stats.euVoyages.toLocaleString()}
            sub="Subject to EU ETS reporting"
            color="text-blue-400"
          />
          <KpiCard
            icon={TrendingUp}
            label={`Total CO₂ (${year})`}
            value={`${(stats.totalCo2Mt / 1000).toFixed(1)}k t`}
            sub={`${(stats.totalEtsCo2Mt / 1000).toFixed(1)}k t EU ETS applicable`}
            color="text-orange-400"
          />
          <KpiCard
            icon={CloudRain}
            label="Distance Sailed"
            value={`${(stats.totalDistanceNm / 1000).toFixed(0)}k nm`}
            sub={`${year} fleet total`}
          />
        </div>
      )}

      {/* Filters bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="h-4 w-4 text-gray-600 shrink-0" />

        {/* Year */}
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          {[CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
          <option value="">All Years</option>
        </select>

        {/* Vessel */}
        <select
          value={vesselFilter}
          onChange={(e) => setVessel(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">All Vessels</option>
          {vessels.map((v: any) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>

        {/* Status */}
        <select
          value={statusFilter}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s ? s.replace('_', ' ') : 'All Statuses'}</option>
          ))}
        </select>

        <span className="ml-auto text-xs text-gray-600">
          {loading ? 'Loading…' : `${voyages.length} voyages`}
        </span>
      </div>

      {/* Voyage table */}
      <ErrorBoundary>
        <div className="bg-gray-800 rounded-xl overflow-hidden">
          <VoyageTable
            voyages={voyages}
            loading={loading}
            onEdit={(v) => { setEditVoyage(v); setShowForm(true); }}
            onDeleted={handleDeleted}
          />
        </div>
      </ErrorBoundary>

      {/* Post-import info */}
      {voyages.length > 0 && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
          <p className="text-sm font-medium text-blue-300 mb-1">After adding voyages</p>
          <p className="text-xs text-gray-400">
            Go to <strong className="text-gray-300">CII</strong>, <strong className="text-gray-300">EU ETS</strong>, or <strong className="text-gray-300">FuelEU</strong> and click <em>Recalculate</em> to update your compliance metrics based on the new voyage data.
          </p>
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <VoyageForm
          voyage={editVoyage ?? undefined}
          onClose={() => { setShowForm(false); setEditVoyage(null); }}
          onSaved={handleSaved}
        />
      )}
      {showImport && (
        <CsvImportModal
          onClose={() => setShowImport(false)}
          onImported={handleSaved}
        />
      )}
    </div>
  );
}
