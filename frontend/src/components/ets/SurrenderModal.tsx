import { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { X, AlertTriangle, CheckCircle } from 'lucide-react';

const SURRENDER = gql`
  mutation SurrenderEua($vesselId: String!, $year: Int!, $euaAmount: Float!, $accountId: String!) {
    surrenderEtsAllowances(vesselId: $vesselId, year: $year, euaAmount: $euaAmount, accountId: $accountId) {
      id obligationMt euaSurrendered shortfallMt isSettled
    }
  }
`;

interface Props {
  record: {
    vesselId: string;
    year: number;
    shortfallMt: number;
    obligationMt: number;
    euaSurrendered: number;
    surrenderDeadline: string;
    vessel: { name: string; imo: string };
    account: { id: string; euaBalance: number };
  };
  euaPrice: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function SurrenderModal({ record, euaPrice, onClose, onSuccess }: Props) {
  const [amount, setAmount] = useState(Math.ceil(record.shortfallMt));
  const [surrender, { loading, data, error }] = useMutation(SURRENDER);

  const cost = amount * euaPrice;
  const afterBalance = record.account.euaBalance - amount;
  const coversFull = amount >= record.shortfallMt;
  const deadline = new Date(record.surrenderDeadline);
  const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / 86_400_000);

  async function handleSubmit() {
    await surrender({
      variables: {
        vesselId: record.vesselId,
        year: record.year,
        euaAmount: amount,
        accountId: record.account.id,
      },
    });
    onSuccess();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h2 className="font-semibold text-white">Surrender EUAs</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Vessel info */}
          <div className="bg-gray-700/40 rounded-lg p-3">
            <p className="text-sm font-medium text-white">{record.vessel.name}</p>
            <p className="text-xs text-gray-400">IMO {record.vessel.imo} · {record.year} obligation</p>
          </div>

          {/* Deadline warning */}
          <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${
            daysLeft <= 14 ? 'bg-red-500/10 text-red-400 border border-red-500/20'
            : daysLeft <= 30 ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
            : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
          }`}>
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Surrender deadline: {deadline.toLocaleDateString()} ({daysLeft} days)
          </div>

          {/* Obligation summary */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-gray-700/40 rounded-lg p-2">
              <p className="text-gray-500">Obligation</p>
              <p className="text-white font-mono font-bold mt-0.5">{record.obligationMt.toFixed(0)}</p>
            </div>
            <div className="bg-gray-700/40 rounded-lg p-2">
              <p className="text-gray-500">Surrendered</p>
              <p className="text-green-400 font-mono font-bold mt-0.5">{record.euaSurrendered.toFixed(0)}</p>
            </div>
            <div className="bg-gray-700/40 rounded-lg p-2">
              <p className="text-gray-500">Shortfall</p>
              <p className="text-red-400 font-mono font-bold mt-0.5">{record.shortfallMt.toFixed(0)}</p>
            </div>
          </div>

          {/* Amount input */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">
              EUAs to surrender (account balance: {record.account.euaBalance.toFixed(0)})
            </label>
            <input
              type="number"
              value={amount}
              min={1}
              max={record.account.euaBalance}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Cost preview */}
          <div className="bg-gray-700/40 rounded-lg p-3 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">EUA price</span>
              <span className="text-white font-mono">€{euaPrice.toFixed(2)}/t</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Total value</span>
              <span className="text-white font-mono">€{cost.toFixed(0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Balance after</span>
              <span className={afterBalance < 0 ? 'text-red-400' : 'text-white'} >
                {afterBalance.toFixed(0)} EUA
              </span>
            </div>
            {coversFull && (
              <div className="flex items-center gap-1 text-green-400 mt-1 pt-1 border-t border-gray-600">
                <CheckCircle className="h-3.5 w-3.5" />
                Covers full {record.year} obligation
              </div>
            )}
          </div>

          {afterBalance < 0 && (
            <p className="text-xs text-red-400">
              ⚠ Insufficient balance — buy more EUAs first ({Math.abs(afterBalance).toFixed(0)} short)
            </p>
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
            onClick={handleSubmit}
            disabled={loading || afterBalance < 0 || amount <= 0}
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? 'Processing...' : `Surrender ${amount} EUAs`}
          </button>
        </div>
      </div>
    </div>
  );
}
