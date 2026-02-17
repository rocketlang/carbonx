import { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { Edit2, Trash2, AlertCircle } from 'lucide-react';
import type { VoyageRow } from './VoyageForm.js';

const DELETE_M = gql`mutation DeleteVoyage($id: String!) { deleteVoyage(id: $id) }`;

const SCOPE_BADGE: Record<string, { label: string; cls: string }> = {
  eu_eu:     { label: 'EU→EU',     cls: 'bg-blue-500/15 text-blue-400 border border-blue-500/20' },
  eu_non_eu: { label: 'EU (50%)',   cls: 'bg-amber-500/15 text-amber-400 border border-amber-500/20' },
  none:      { label: 'Non-EU',     cls: 'bg-gray-700 text-gray-500' },
};

const STATUS_BADGE: Record<string, string> = {
  completed:   'bg-emerald-500/15 text-emerald-400',
  in_progress: 'bg-amber-500/15 text-amber-400',
  planned:     'bg-gray-700 text-gray-400',
  verified:    'bg-blue-500/15 text-blue-400',
};

function fmt(n: number, dp = 1): string {
  if (!n) return '—';
  return n.toFixed(dp);
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface Props {
  voyages: VoyageRow[];
  loading?: boolean;
  onEdit: (voyage: VoyageRow) => void;
  onDeleted: () => void;
}

export function VoyageTable({ voyages, loading, onEdit, onDeleted }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId,  setConfirmId]  = useState<string | null>(null);

  const [deleteVoyage] = useMutation(DELETE_M, {
    onCompleted: () => { setDeletingId(null); setConfirmId(null); onDeleted(); },
    onError: (e) => { setDeletingId(null); alert(e.message); },
  });

  function handleDelete(id: string) {
    if (confirmId !== id) { setConfirmId(id); return; }
    setDeletingId(id);
    setConfirmId(null);
    deleteVoyage({ variables: { id } });
  }

  if (loading) return (
    <div className="text-center py-12 text-gray-600 text-sm">Loading voyages…</div>
  );

  if (voyages.length === 0) return (
    <div className="text-center py-12">
      <p className="text-gray-500 text-sm">No voyages found</p>
      <p className="text-gray-700 text-xs mt-1">Log a voyage or import from CSV to get started</p>
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            {['Voyage #','Route','Departed','Distance','HFO','MGO','LNG','CO₂','ETS Scope','Status',''].map((h) => (
              <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {voyages.map((v) => {
            const scope  = SCOPE_BADGE[v.etsScope]  ?? SCOPE_BADGE.none;
            const status = STATUS_BADGE[v.status] ?? STATUS_BADGE.planned;
            const isDeleting = deletingId === v.id;
            const isConfirm  = confirmId  === v.id;

            return (
              <tr key={v.id} className="hover:bg-gray-800/30 transition-colors group">
                <td className="px-3 py-2.5 font-mono text-xs text-gray-300 whitespace-nowrap">{v.voyageNumber}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-gray-300">{v.departurePort}</span>
                    <span className="text-gray-600">→</span>
                    <span className="text-gray-300">{v.arrivalPort}</span>
                  </div>
                  <div className="text-xs text-gray-600">{v.departurePortCountry}→{v.arrivalPortCountry}</div>
                </td>
                <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">{shortDate(v.departureAt)}</td>
                <td className="px-3 py-2.5 text-xs text-gray-300 whitespace-nowrap">{v.distanceNm.toLocaleString()} nm</td>
                <td className="px-3 py-2.5 text-xs text-gray-400">{fmt(v.hfoConsumedMt)} t</td>
                <td className="px-3 py-2.5 text-xs text-gray-400">{fmt(v.mgoConsumedMt)} t</td>
                <td className="px-3 py-2.5 text-xs text-gray-400">{fmt(v.lngConsumedMt)} t</td>
                <td className="px-3 py-2.5 text-xs font-medium text-gray-300 whitespace-nowrap">{fmt(v.co2EmissionsMt, 2)} t</td>
                <td className="px-3 py-2.5">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${scope.cls}`}>{scope.label}</span>
                </td>
                <td className="px-3 py-2.5">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${status}`}>
                    {v.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEdit(v)}
                      className="h-6 w-6 flex items-center justify-center rounded hover:bg-gray-700 text-gray-500 hover:text-gray-300 transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(v.id)}
                      disabled={isDeleting}
                      className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${
                        isConfirm
                          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                          : 'hover:bg-gray-700 text-gray-500 hover:text-red-400'
                      }`}
                      title={isConfirm ? 'Click again to confirm delete' : 'Delete'}
                    >
                      {isConfirm ? <AlertCircle className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
