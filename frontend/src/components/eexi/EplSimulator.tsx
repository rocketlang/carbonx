/**
 * EEXI + EPL Simulator
 * What-if: adjust vessel parameters → see EEXI + required EPL
 */
import { useState } from 'react';
import { useLazyQuery, gql } from '@apollo/client';
import { Calculator, RefreshCw, CheckCircle, XCircle, AlertTriangle, Zap } from 'lucide-react';
import { EexiGaugeMeter } from './EexiGaugeMeter.js';

const SIMULATE_EEXI = gql`
  query SimulateEexi(
    $vesselType: String! $dwt: Float! $gt: Float!
    $mcrKw: Float! $designSpeedKn: Float!
    $fuelType: String $sfcGkWh: Float
    $fwFactor: Float $eplFraction: Float
  ) {
    simulateEexi(
      vesselType: $vesselType dwt: $dwt gt: $gt
      mcrKw: $mcrKw designSpeedKn: $designSpeedKn
      fuelType: $fuelType sfcGkWh: $sfcGkWh
      fwFactor: $fwFactor eplFraction: $eplFraction
    ) {
      attainedEexi requiredEexi eexiGap isCompliant
      eplFraction speedPenaltyPct pMe75Kw capacity reductionPct
    }
  }
`;

const VESSEL_TYPES = [
  { value: 'bulker',          label: 'Bulk Carrier' },
  { value: 'tanker',          label: 'Tanker' },
  { value: 'container',       label: 'Container' },
  { value: 'gas_carrier',     label: 'Gas Carrier' },
  { value: 'lng_carrier',     label: 'LNG Carrier' },
  { value: 'ro_ro_cargo',     label: 'Ro-Ro Cargo' },
  { value: 'general_cargo',   label: 'General Cargo' },
  { value: 'refrigerated',    label: 'Refrigerated' },
];

const FUEL_TYPES = [
  { value: 'hfo',      label: 'HFO (CF=3.1144)' },
  { value: 'mgo',      label: 'MGO (CF=3.206)' },
  { value: 'lng',      label: 'LNG (CF=2.75)' },
  { value: 'methanol', label: 'Methanol (CF=1.375)' },
];

export function EplSimulator() {
  const [params, setParams] = useState({
    vesselType:    'bulker',
    dwt:           70000,
    gt:            40000,
    mcrKw:         10000,
    designSpeedKn: 14.0,
    fuelType:      'hfo',
    sfcGkWh:       175,
    fwFactor:      1.0,
    eplFraction:   1.0,  // 100% MCR by default
  });

  const [simulate, { data, loading }] = useLazyQuery(SIMULATE_EEXI);
  const result = data?.simulateEexi;

  function set(key: string, value: string | number) {
    setParams((p) => ({ ...p, [key]: value }));
  }

  function run() {
    simulate({ variables: params });
  }

  return (
    <div className="bg-gray-800 rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Calculator className="h-4 w-4 text-emerald-400" />
        <h3 className="font-semibold text-white text-sm">EEXI / EPL Calculator</h3>
      </div>

      {/* Inputs: two-column grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
        {/* Vessel type */}
        <div className="col-span-2 sm:col-span-1">
          <label className="text-gray-400 block mb-1">Vessel Type</label>
          <select
            value={params.vesselType}
            onChange={(e) => set('vesselType', e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
          >
            {VESSEL_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {[
          { key: 'dwt',           label: 'DWT (t)',           step: 1000, min: 1000 },
          { key: 'gt',            label: 'GT',                step: 1000, min: 1000 },
          { key: 'mcrKw',         label: 'MCR (kW)',          step: 500,  min: 500  },
          { key: 'designSpeedKn', label: 'Design Speed (kn)', step: 0.5,  min: 5    },
          { key: 'sfcGkWh',       label: 'SFC (g/kWh)',       step: 5,    min: 100  },
        ].map(({ key, label, step, min }) => (
          <div key={key}>
            <label className="text-gray-400 block mb-1">{label}</label>
            <input
              type="number"
              value={params[key as keyof typeof params] as number}
              step={step}
              min={min}
              onChange={(e) => set(key, Number(e.target.value))}
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
            />
          </div>
        ))}

        {/* Fuel type */}
        <div>
          <label className="text-gray-400 block mb-1">Fuel Type</label>
          <select
            value={params.fuelType}
            onChange={(e) => set('fuelType', e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
          >
            {FUEL_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* EPL slider */}
        <div className="col-span-2 sm:col-span-3">
          <label className="text-gray-400 block mb-1">
            Engine Power Limitation (EPL) — {(params.eplFraction * 100).toFixed(0)}% of MCR
          </label>
          <input
            type="range"
            min={0.3}
            max={1.0}
            step={0.01}
            value={params.eplFraction}
            onChange={(e) => set('eplFraction', Number(e.target.value))}
            className="w-full accent-emerald-500"
          />
          <div className="flex justify-between text-gray-600 text-xs mt-0.5">
            <span>30% MCR</span>
            <span>100% MCR (no limit)</span>
          </div>
        </div>
      </div>

      <button
        onClick={run}
        disabled={loading}
        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
        {loading ? 'Calculating...' : 'Calculate EEXI'}
      </button>

      {/* Result */}
      {result && (
        <div className="pt-3 border-t border-gray-700 space-y-4">
          {/* Gauge + verdict */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <EexiGaugeMeter
              attained={result.attainedEexi}
              required={result.requiredEexi}
              size="md"
            />
            <div className="flex-1 space-y-2">
              <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
                result.isCompliant
                  ? 'bg-green-500/10 text-green-300 border border-green-500/20'
                  : 'bg-red-500/10 text-red-300 border border-red-500/20'
              }`}>
                {result.isCompliant
                  ? <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  : <XCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                <span>
                  {result.isCompliant
                    ? 'EEXI compliant — no Engine Power Limitation needed'
                    : `Non-compliant — EPL required to ${(result.eplFraction * 100).toFixed(1)}% MCR`}
                </span>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <KpiCell label="Attained EEXI"
                  value={`${result.attainedEexi.toFixed(3)} gCO₂/t·nm`}
                  color={result.isCompliant ? 'green' : 'red'} />
                <KpiCell label={`Required EEXI (-${result.reductionPct}%)`}
                  value={`${result.requiredEexi.toFixed(3)} gCO₂/t·nm`}
                  color="blue" />
                <KpiCell label="P_ME @ 75% MCR"
                  value={`${result.pMe75Kw.toFixed(0)} kW`}
                  color="gray" />
                <KpiCell label="Capacity"
                  value={`${result.capacity.toFixed(0)} t`}
                  color="gray" />
              </div>
            </div>
          </div>

          {/* EPL details if needed */}
          {!result.isCompliant && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-orange-300 font-medium">
                <AlertTriangle className="h-3.5 w-3.5" />
                Engine Power Limitation (EPL) Required
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <p className="text-gray-500">Required EPL</p>
                  <p className="text-white font-mono font-bold">
                    {(result.eplFraction * 100).toFixed(1)}% of MCR
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Est. Speed Penalty</p>
                  <p className="text-orange-300 font-mono font-bold">
                    -{result.speedPenaltyPct.toFixed(1)}%
                  </p>
                </div>
              </div>
              <p className="text-gray-500 mt-1">
                <span className="text-gray-400">SHA limit:</span>{' '}
                {(result.eplFraction * 0.75 * params.mcrKw).toFixed(0)} kW shaft power limit
              </p>
              <div className="flex items-center gap-1.5 text-gray-400 mt-1.5">
                <Zap className="h-3 w-3" />
                <span>Alternative: switch to MDO/LNG to lower CF and reduce attained EEXI</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function KpiCell({ label, value, color }: { label: string; value: string; color: string }) {
  const colorClass = {
    green: 'text-green-400',
    red:   'text-red-400',
    blue:  'text-blue-400',
    gray:  'text-gray-300',
  }[color] ?? 'text-gray-300';
  return (
    <div className="bg-gray-700/40 rounded-lg p-2">
      <p className="text-gray-500">{label}</p>
      <p className={`font-mono font-bold mt-0.5 ${colorClass}`}>{value}</p>
    </div>
  );
}
