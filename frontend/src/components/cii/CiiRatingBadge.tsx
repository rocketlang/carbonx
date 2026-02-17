type Rating = 'A' | 'B' | 'C' | 'D' | 'E';

const STYLES: Record<Rating, { bg: string; text: string; border: string; label: string }> = {
  A: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/40', label: 'Major improvement' },
  B: { bg: 'bg-green-500/15',   text: 'text-green-400',   border: 'border-green-500/40',   label: 'Minor improvement' },
  C: { bg: 'bg-yellow-500/15',  text: 'text-yellow-400',  border: 'border-yellow-500/40',  label: 'Moderate' },
  D: { bg: 'bg-orange-500/15',  text: 'text-orange-400',  border: 'border-orange-500/40',  label: 'Minor deterioration' },
  E: { bg: 'bg-red-500/15',     text: 'text-red-400',     border: 'border-red-500/40',     label: 'Major deterioration' },
};

interface Props {
  rating: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
}

export function CiiRatingBadge({ rating, size = 'md', showLabel = false }: Props) {
  const r = (rating as Rating) in STYLES ? (rating as Rating) : 'C';
  const style = STYLES[r];

  const sizeClass = {
    sm:  'h-6 w-6 text-xs font-bold',
    md:  'h-8 w-8 text-sm font-bold',
    lg:  'h-12 w-12 text-xl font-black',
    xl:  'h-16 w-16 text-3xl font-black',
  }[size];

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <div
        className={`${sizeClass} ${style.bg} ${style.text} border ${style.border} rounded-lg flex items-center justify-center`}
        title={`CII Rating ${r} — ${style.label}`}
      >
        {r}
      </div>
      {showLabel && (
        <span className={`text-xs ${style.text}`}>{style.label}</span>
      )}
    </div>
  );
}

/** Inline text color class for a rating — use with className */
export function ratingColor(rating: string): string {
  const styles = STYLES[rating as Rating];
  return styles?.text ?? 'text-gray-400';
}

/** Full color bar for a CII ratio gauge */
export function CiiGaugeBar({ ratio, vesselType }: { ratio: number; vesselType?: string }) {
  // Boundaries (approximate for generic types)
  const ab = 0.677, bc = 0.795, cd = 1.162, de = 1.336;
  const pct = Math.min((ratio / 1.6) * 100, 100);

  const color = ratio < ab ? 'bg-emerald-500'
    : ratio < bc ? 'bg-green-400'
    : ratio < cd ? 'bg-yellow-400'
    : ratio < de ? 'bg-orange-400'
    : 'bg-red-500';

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>A</span>
        <span>B</span>
        <span>C</span>
        <span>D</span>
        <span>E</span>
      </div>
      <div className="relative h-2.5 bg-gray-700 rounded-full overflow-hidden">
        {/* Rating zone backgrounds */}
        <div className="absolute inset-0 flex">
          <div style={{ width: `${(ab / 1.6) * 100}%` }} className="bg-emerald-500/20" />
          <div style={{ width: `${((bc - ab) / 1.6) * 100}%` }} className="bg-green-500/20" />
          <div style={{ width: `${((cd - bc) / 1.6) * 100}%` }} className="bg-yellow-500/20" />
          <div style={{ width: `${((de - cd) / 1.6) * 100}%` }} className="bg-orange-500/20" />
          <div className="flex-1 bg-red-500/20" />
        </div>
        {/* Current position marker */}
        <div
          className={`absolute top-0 h-full w-1 ${color} rounded-full shadow-lg`}
          style={{ left: `calc(${pct}% - 2px)` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1 text-right">
        Ratio: <span className="text-gray-300 font-mono">{ratio.toFixed(3)}</span>
      </p>
    </div>
  );
}
