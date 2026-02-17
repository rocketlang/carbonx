/**
 * FuelEU Fuel Mix Simulator
 * What-if tool: adjust fuel mix → see GHG intensity + penalty
 */
import { useState } from 'react';
import { useLazyQuery, gql } from '@apollo/client';
import { Calculator, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { FuelMixChart } from './FuelMixChart.js';

const SIMULATE = gql`
  query SimulateFuelMix(
    $year: Int!
    $hfoMt: Float $mgoMt: Float $lngMt: Float
    $methanolMt: Float $methanolBioMt: Float $biofuelMt: Float
    $bioLngMt: Float $ammoniaGreenMt: Float $h2GreenMt: Float
  ) {
    simulateFuelMix(
      year: $year hfoMt: $hfoMt mgoMt: $mgoMt lngMt: $lngMt
      methanolMt: $methanolMt methanolBioMt: $methanolBioMt biofuelMt: $biofuelMt
      bioLngMt: $bioLngMt ammoniaGreenMt: $ammoniaGreenMt h2GreenMt: $h2GreenMt
    ) {
      actualGhgIntensity targetGhgIntensity ghgGap isCompliant penaltyEur totalEnergyMj
      breakdown { fuelType ghgFactor lhvMjPerTonne energyMj ghgIntensityContrib }
    }
  }
`;

const FUEL_INPUTS = [
  { key: 'hfoMt',          label: 'HFO/VLSFO',    unit: 't', color: 'text-red-400' },
  { key: 'mgoMt',          label: 'MGO',           unit: 't', color: 'text-orange-400' },
  { key: 'lngMt',          label: 'LNG (Otto)',    unit: 't', color: 'text-blue-400' },
  { key: 'methanolMt',     label: 'Methanol',      unit: 't', color: 'text-yellow-400' },
  { key: 'methanolBioMt',  label: 'Bio-Methanol',  unit: 't', color: 'text-green-400' },
  { key: 'biofuelMt',      label: 'Biofuel',       unit: 't', color: 'text-lime-400' },
  { key: 'bioLngMt',       label: 'Bio-LNG',       unit: 't', color: 'text-emerald-400' },
  { key: 'ammoniaGreenMt', label: 'Green NH₃',     unit: 't', color: 'text-cyan-400' },
  { key: 'h2GreenMt',      label: 'Green H₂',      unit: 't', color: 'text-purple-400' },
];

interface Props { year: number }

export function FuelMixSimulator({ year }: Props) {
  const [inputs, setInputs] = useState<Record<string, number>>({
    hfoMt: 1000, mgoMt: 200, lngMt: 0, methanolMt: 0, methanolBioMt: 0,
    biofuelMt: 0, bioLngMt: 0, ammoniaGreenMt: 0, h2GreenMt: 0,
  });

  const [simulate, { data, loading }] = useLazyQuery(SIMULATE);
  const result = data?.simulateFuelMix;

  function run() {
    simulate({ variables: { year, ...inputs } });
  }

  return (
    <div className="bg-gray-800 rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Calculator className="h-4 w-4 text-blue-400" />
        <h3 className="font-semibold text-white text-sm">Fuel Mix Simulator</h3>
        <span className="text-xs text-gray-500 ml-1">({year} target)</span>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {FUEL_INPUTS.map(({ key, label, color }) => (
          <div key={key}>
            <label className={`text-xs block mb-1 ${color}`}>{label}</label>
            <input
              type="number"
              value={inputs[key] ?? 0}
              min={0}
              step={100}
              onChange={(e) => setInputs((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        ))}
      </div>

      <button
        onClick={run}
        disabled={loading}
        className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
        {loading ? 'Calculating...' : 'Simulate'}
      </button>

      {/* Result */}
      {result && (
        <div className="space-y-3 pt-2 border-t border-gray-700">
          {/* Compliance verdict */}
          <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
            result.isCompliant
              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {result.isCompliant
              ? <CheckCircle className="h-4 w-4 shrink-0" />
              : <XCircle className="h-4 w-4 shrink-0" />}
            <span>
              {result.isCompliant
                ? `Compliant — ${Math.abs(result.ghgGap).toFixed(2)} gCO₂eq/MJ below target`
                : `Non-compliant — ${result.ghgGap.toFixed(2)} gCO₂eq/MJ above target`}
            </span>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-gray-700/40 rounded-lg p-2">
              <p className="text-gray-500">Actual</p>
              <p className="text-white font-mono font-bold mt-0.5">
                {result.actualGhgIntensity.toFixed(2)}
              </p>
              <p className="text-gray-600">gCO₂eq/MJ</p>
            </div>
            <div className="bg-gray-700/40 rounded-lg p-2">
              <p className="text-gray-500">Target</p>
              <p className="text-blue-400 font-mono font-bold mt-0.5">
                {result.targetGhgIntensity.toFixed(2)}
              </p>
              <p className="text-gray-600">gCO₂eq/MJ</p>
            </div>
            <div className="bg-gray-700/40 rounded-lg p-2">
              <p className="text-gray-500">Est. Penalty</p>
              <p className={`font-mono font-bold mt-0.5 ${result.penaltyEur > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {result.penaltyEur > 0 ? `€${(result.penaltyEur / 1000).toFixed(0)}k` : '€0'}
              </p>
              <p className="text-gray-600">annual</p>
            </div>
          </div>

          {/* Breakdown chart */}
          {result.breakdown?.length > 0 && (
            <FuelMixChart
              breakdown={result.breakdown}
              actualGhgIntensity={result.actualGhgIntensity}
              targetGhgIntensity={result.targetGhgIntensity}
            />
          )}
        </div>
      )}
    </div>
  );
}
