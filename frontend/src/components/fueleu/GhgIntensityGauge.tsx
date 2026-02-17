/**
 * GHG Intensity Gauge
 * Visual scale from 0 to ~100 gCO2eq/MJ
 * Shows actual vs target with compliance zone
 */
interface Props {
  actual: number;
  target: number;
  baseline?: number;
  size?: 'sm' | 'md' | 'lg';
}

const BASELINE = 91.16;
const MAX_SCALE = 100; // gCO2eq/MJ

export function GhgIntensityGauge({ actual, target, baseline = BASELINE, size = 'md' }: Props) {
  const actualPct  = Math.min(100, (actual  / MAX_SCALE) * 100);
  const targetPct  = Math.min(100, (target  / MAX_SCALE) * 100);
  const baselinePct = Math.min(100, (baseline / MAX_SCALE) * 100);

  const isCompliant = actual <= target;
  const gapPct      = Math.abs(actualPct - targetPct);

  const barH = size === 'sm' ? 'h-3' : size === 'lg' ? 'h-5' : 'h-4';

  return (
    <div className="space-y-1.5">
      {/* Scale bar */}
      <div className={`relative w-full ${barH} bg-gray-700 rounded-full overflow-hidden`}>
        {/* Green zone: 0 → target */}
        <div
          className="absolute inset-y-0 left-0 bg-green-500/20"
          style={{ width: `${targetPct}%` }}
        />
        {/* Actual fill */}
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${
            isCompliant ? 'bg-green-500' : 'bg-red-500'
          }`}
          style={{ width: `${actualPct}%` }}
        />
        {/* Target tick */}
        <div
          className="absolute inset-y-0 w-0.5 bg-blue-400 z-10"
          style={{ left: `${targetPct}%` }}
          title={`Target: ${target.toFixed(2)} gCO2eq/MJ`}
        />
        {/* Baseline tick */}
        <div
          className="absolute inset-y-0 w-0.5 bg-gray-500 z-10 opacity-60"
          style={{ left: `${baselinePct}%` }}
          title={`Baseline: ${baseline.toFixed(2)} gCO2eq/MJ`}
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between text-xs text-gray-500">
        <span>0</span>
        <span className="text-blue-400 font-medium">
          ← target {target.toFixed(1)}
        </span>
        <span>100 gCO2eq/MJ</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Compact badge for table rows
// ─────────────────────────────────────────────
export function FuelEuStatusBadge({
  isCompliant,
  ghgGap,
}: {
  isCompliant: boolean;
  ghgGap: number;
}) {
  if (isCompliant) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">
        <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
        Compliant
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
      <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
      +{ghgGap.toFixed(1)} gCO2eq/MJ
    </span>
  );
}
