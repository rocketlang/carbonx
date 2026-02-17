import { useState } from 'react';
import { useLazyQuery, gql } from '@apollo/client';
import { Play, TrendingDown, Fuel, Wind } from 'lucide-react';
import { CiiRatingBadge } from './CiiRatingBadge.js';

const SIMULATE = gql`
  query SimulateCii(
    $vesselId: String!
    $year: Int!
    $speedReductionPct: Float
    $fuelSwitchPct: Float
    $newFuelType: String
    $targetRating: String
  ) {
    simulateCiiImprovement(
      vesselId: $vesselId
      year: $year
      speedReductionPct: $speedReductionPct
      fuelSwitchPct: $fuelSwitchPct
      newFuelType: $newFuelType
      targetRating: $targetRating
    ) {
      newCiiRatio newRating co2ReductionPct ratingChange co2BudgetKgForTargetRating
    }
  }
`;

const FUEL_OPTIONS = [
  { value: 'lng',      label: 'LNG (-12% CO₂)' },
  { value: 'methanol', label: 'Methanol (-56%)' },
  { value: 'biofuel',  label: 'Biofuel (−100%)' },
  { value: 'mgo',      label: 'MGO (low sulphur)' },
];

interface Props {
  vesselId: string;
  year: number;
  currentRating: string;
}

export function CiiSimulator({ vesselId, year, currentRating }: Props) {
  const [speedReduction, setSpeedReduction] = useState(0);
  const [fuelSwitch, setFuelSwitch] = useState(0);
  const [fuelType, setFuelType] = useState('lng');
  const [targetRating, setTargetRating] = useState('B');

  const [simulate, { data, loading }] = useLazyQuery(SIMULATE);

  function run() {
    simulate({
      variables: {
        vesselId,
        year,
        speedReductionPct: speedReduction > 0 ? speedReduction / 100 : undefined,
        fuelSwitchPct: fuelSwitch > 0 ? fuelSwitch / 100 : undefined,
        newFuelType: fuelSwitch > 0 ? fuelType : undefined,
        targetRating,
      },
    });
  }

  const result = data?.simulateCiiImprovement;

  return (
    <div className="bg-gray-800 rounded-xl p-4 space-y-4">
      <h3 className="font-semibold text-white flex items-center gap-2">
        <Wind className="h-4 w-4 text-blue-400" />
        What-If Simulator
      </h3>

      <div className="grid grid-cols-1 gap-3">
        {/* Speed reduction */}
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-xs text-gray-400 flex items-center gap-1">
              <TrendingDown className="h-3 w-3" /> Speed reduction
            </label>
            <span className="text-xs font-mono text-blue-300">{speedReduction}%</span>
          </div>
          <input
            type="range" min={0} max={25} step={1}
            value={speedReduction}
            onChange={(e) => setSpeedReduction(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
          {speedReduction > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">
              ~{(speedReduction * 3).toFixed(0)}% fuel saving (cubic law)
            </p>
          )}
        </div>

        {/* Fuel switch */}
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-xs text-gray-400 flex items-center gap-1">
              <Fuel className="h-3 w-3" /> Fuel switch %
            </label>
            <span className="text-xs font-mono text-blue-300">{fuelSwitch}%</span>
          </div>
          <input
            type="range" min={0} max={100} step={5}
            value={fuelSwitch}
            onChange={(e) => setFuelSwitch(Number(e.target.value))}
            className="w-full accent-emerald-500"
          />
          {fuelSwitch > 0 && (
            <select
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value)}
              className="mt-1 w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200"
            >
              {FUEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )}
        </div>

        {/* Target rating */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">Target rating for CO₂ budget</label>
          <div className="flex gap-2">
            {['A', 'B', 'C', 'D'].map((r) => (
              <button
                key={r}
                onClick={() => setTargetRating(r)}
                className={`flex-1 py-1 rounded text-xs font-bold border transition-colors ${
                  targetRating === r
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                    : 'border-gray-600 text-gray-500 hover:border-gray-500'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={run}
        disabled={loading || (speedReduction === 0 && fuelSwitch === 0)}
        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg px-3 py-2 transition-colors"
      >
        <Play className="h-3.5 w-3.5" />
        {loading ? 'Calculating...' : 'Run Simulation'}
      </button>

      {/* Results */}
      {result && (
        <div className="border border-gray-700 rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Current</p>
              <CiiRatingBadge rating={currentRating} size="sm" />
            </div>
            <div className="text-gray-500 text-lg font-bold">→</div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Projected</p>
              <CiiRatingBadge rating={result.newRating} size="sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-700/50 rounded px-2 py-1.5">
              <p className="text-gray-500">Rating change</p>
              <p className="font-medium text-white">{result.ratingChange}</p>
            </div>
            <div className="bg-gray-700/50 rounded px-2 py-1.5">
              <p className="text-gray-500">CO₂ reduction</p>
              <p className="font-medium text-emerald-400">{result.co2ReductionPct.toFixed(1)}%</p>
            </div>
            <div className="bg-gray-700/50 rounded px-2 py-1.5 col-span-2">
              <p className="text-gray-500">CO₂ budget for Rating {targetRating}</p>
              <p className="font-mono text-white">{(result.co2BudgetKgForTargetRating / 1000).toFixed(0)} t CO₂</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
