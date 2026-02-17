/**
 * Retire Carbon Credits Modal
 * Permanently cancel credits for an offset claim
 */
import { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { X, Flame, AlertTriangle, CheckCircle } from 'lucide-react';

const RETIRE = gql`
  mutation RetireCarbonCredits($creditId: String! $quantity: Float! $retiredFor: String!) {
    retireCarbonCredits(creditId: $creditId quantity: $quantity retiredFor: $retiredFor) {
      retired retiredFor
    }
  }
`;

const CLAIM_TEMPLATES = [
  'IMO CII compliance offset — {year}',
  'EU ETS shortfall offset — {year}',
  'FuelEU Maritime compliance — {year}',
  'Voluntary Scope 1 shipping emissions — {year}',
  'Scope 3 freight emissions offset — {year}',
  'Net-zero voyage claim — {route}',
];

interface Props {
  credit: {
    id: string;
    projectName: string;
    standard: string;
    vintage: number;
    quantity: number;
    country: string;
    projectType: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function RetireModal({ credit, onClose, onSuccess }: Props) {
  const [quantity, setQuantity] = useState(credit.quantity);
  const [retiredFor, setRetiredFor] = useState('');
  const [retire, { loading, data, error }] = useMutation(RETIRE);

  const currentYear = new Date().getFullYear();
  const isComplete = data?.retireCarbonCredits;

  async function handleRetire() {
    if (!retiredFor.trim()) return;
    await retire({
      variables: { creditId: credit.id, quantity, retiredFor },
    });
    onSuccess();
  }

  const STANDARD_LABELS: Record<string, string> = {
    gold_standard: 'Gold Standard', verra_vcs: 'Verra VCS',
    plan_vivo: 'Plan Vivo', american_carbon_registry: 'ACR',
    climate_action_reserve: 'CAR',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Flame className="h-4 w-4 text-red-400" />
            Retire Carbon Credits
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Credit info */}
          <div className="bg-gray-700/40 rounded-lg p-3 space-y-1">
            <p className="text-sm font-medium text-white">{credit.projectName}</p>
            <p className="text-xs text-gray-400">
              {STANDARD_LABELS[credit.standard] ?? credit.standard} ·{' '}
              {credit.country} · Vintage {credit.vintage}
            </p>
            <p className="text-xs text-gray-500">
              Available: <span className="text-white">{credit.quantity.toFixed(0)} tCO₂e</span>
            </p>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 text-xs rounded-lg px-3 py-2 bg-red-500/10 text-red-400 border border-red-500/20">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              Retirement is <strong>permanent and irreversible</strong>. Retired credits are cancelled
              in the registry and cannot be resold or transferred.
            </span>
          </div>

          {/* Quantity */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">
              Quantity to retire (tCO₂e)
            </label>
            <input
              type="number"
              value={quantity}
              min={1}
              max={credit.quantity}
              step={1}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          {/* Claim / purpose */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">
              Retirement claim (what you're offsetting)
            </label>
            <input
              type="text"
              value={retiredFor}
              onChange={(e) => setRetiredFor(e.target.value)}
              placeholder="e.g. IMO CII compliance 2024"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            {/* Quick templates */}
            <div className="flex flex-wrap gap-1 mt-2">
              {CLAIM_TEMPLATES.slice(0, 3).map((t) => (
                <button
                  key={t}
                  onClick={() => setRetiredFor(
                    t.replace('{year}', String(currentYear)).replace('{route}', 'voyage')
                  )}
                  className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                >
                  {t.replace('{year}', String(currentYear)).replace('{route}', 'voyage')}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {quantity > 0 && retiredFor && (
            <div className="bg-gray-700/40 rounded-lg p-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Retiring</span>
                <span className="text-white font-mono">{quantity.toFixed(0)} tCO₂e</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Remaining</span>
                <span className="text-white font-mono">{(credit.quantity - quantity).toFixed(0)} tCO₂e</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Claim</span>
                <span className="text-white truncate ml-4">{retiredFor}</span>
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-400">⚠ {error.message}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-600 rounded-lg text-sm text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleRetire}
            disabled={loading || !retiredFor.trim() || quantity <= 0 || quantity > credit.quantity}
            className="flex-1 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading
              ? 'Retiring...'
              : <><Flame className="h-4 w-4" /> Retire {quantity.toFixed(0)} tCO₂e</>}
          </button>
        </div>
      </div>
    </div>
  );
}
