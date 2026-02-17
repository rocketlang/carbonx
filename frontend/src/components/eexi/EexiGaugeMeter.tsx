/**
 * EEXI Gauge Meter
 * Visual dial-style indicator: attained vs required EEXI
 */

interface Props {
  attained: number;
  required: number;
  size?: 'sm' | 'md' | 'lg';
}

export function EexiGaugeMeter({ attained, required, size = 'md' }: Props) {
  const ratio = required > 0 ? attained / required : 1;
  const isCompliant = ratio <= 1;

  // Scale 0–2 ratio to a 0–180° arc
  const MAX_RATIO = 2.0;
  const clampedRatio = Math.min(MAX_RATIO, ratio);
  const angleDeg = (clampedRatio / MAX_RATIO) * 180; // 0° = left, 180° = right

  // Convert to SVG arc coords
  const cx = 60;
  const cy = 60;
  const r = 50;
  const startAngle = 180; // leftmost
  const angle = startAngle - angleDeg; // sweeps right-to-left
  const rad = (angle * Math.PI) / 180;
  const nx = cx + r * Math.cos(rad);
  const ny = cy + r * Math.sin(rad);

  // Required marker position (ratio=1 → 90° from left)
  const reqAngle = startAngle - 90; // halfway = ratio 1.0
  const reqRad = (reqAngle * Math.PI) / 180;
  const reqX = cx + r * Math.cos(reqRad);
  const reqY = cy + r * Math.sin(reqRad);

  const svgSize = size === 'sm' ? 80 : size === 'lg' ? 140 : 120;
  const scale = svgSize / 120;

  return (
    <div className="flex flex-col items-center">
      <svg
        width={svgSize}
        height={svgSize * 0.6}
        viewBox="0 10 120 70"
      >
        {/* Background arc — full gray */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="#374151"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Green zone: 0 → required (first half) */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${reqX} ${reqY}`}
          fill="none"
          stroke="#16a34a"
          strokeWidth="10"
          strokeLinecap="round"
          opacity={0.35}
        />
        {/* Attained fill */}
        {angleDeg > 0 && (
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${nx} ${ny}`}
            fill="none"
            stroke={isCompliant ? '#22c55e' : '#ef4444'}
            strokeWidth="10"
            strokeLinecap="round"
          />
        )}
        {/* Required marker tick */}
        <circle cx={reqX} cy={reqY} r="4" fill="#3b82f6" />

        {/* Center label */}
        <text x={cx} y={cy - 4} textAnchor="middle" className="fill-white" fontSize="14" fontWeight="bold" fill={isCompliant ? '#22c55e' : '#ef4444'}>
          {attained.toFixed(2)}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="8" fill="#6b7280">
          attained
        </text>
        <text x={cx} y={cy + 20} textAnchor="middle" fontSize="8" fill="#6b7280">
          req: {required.toFixed(2)}
        </text>
      </svg>
      <div className={`text-xs font-medium mt-1 ${isCompliant ? 'text-green-400' : 'text-red-400'}`}>
        {isCompliant
          ? `Compliant (${((1 - ratio) * 100).toFixed(1)}% margin)`
          : `Non-compliant (+${((ratio - 1) * 100).toFixed(1)}% above limit)`}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Compact ratio bar for table rows
// ─────────────────────────────────────────────

export function EexiRatioBar({ ratio, isCompliant }: { ratio: number | null; isCompliant: boolean }) {
  if (ratio == null) {
    return <span className="text-xs text-gray-600">Uncertified</span>;
  }
  const pct = Math.min(100, ratio * 50); // 1.0 ratio = 50% of bar
  return (
    <div className="space-y-0.5">
      <div className="w-28 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${isCompliant ? 'bg-green-500' : 'bg-red-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`text-xs font-mono ${isCompliant ? 'text-green-400' : 'text-red-400'}`}>
        {ratio.toFixed(3)}
      </p>
    </div>
  );
}

// Status badge
export function EexiStatusBadge({ isCompliant, certified }: { isCompliant: boolean; certified: boolean }) {
  if (!certified) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-400 border border-gray-600">
        Uncertified
      </span>
    );
  }
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
      EPL Required
    </span>
  );
}
