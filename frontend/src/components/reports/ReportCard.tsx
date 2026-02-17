/**
 * Report Card — clickable card for each report type in the catalog
 */
import { FileText, Download, ExternalLink } from 'lucide-react';

interface Props {
  title: string;
  subtitle: string;
  regulation: string;
  deadline?: string;
  status: 'available' | 'generating' | 'missing_data';
  tags?: string[];
  onGenerate: () => void;
  loading?: boolean;
}

const STATUS_CONFIG = {
  available: {
    dot: 'bg-green-400',
    label: 'Ready',
    labelColor: 'text-green-400',
  },
  generating: {
    dot: 'bg-blue-400 animate-pulse',
    label: 'Generating...',
    labelColor: 'text-blue-400',
  },
  missing_data: {
    dot: 'bg-yellow-400',
    label: 'Partial data',
    labelColor: 'text-yellow-400',
  },
};

export function ReportCard({
  title, subtitle, regulation, deadline, status, tags = [], onGenerate, loading,
}: Props) {
  const cfg = STATUS_CONFIG[status];

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition-colors flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-white text-sm">{title}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
          <span className={`text-xs ${cfg.labelColor}`}>{cfg.label}</span>
        </div>
      </div>

      {/* Regulation ref */}
      <p className="text-xs text-gray-600 font-mono leading-relaxed">{regulation}</p>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span key={tag} className="text-xs px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Deadline */}
      {deadline && (
        <p className="text-xs text-orange-400">
          ⏱ Deadline: {deadline}
        </p>
      )}

      {/* Action */}
      <button
        onClick={onGenerate}
        disabled={loading}
        className="mt-auto w-full py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/30 text-blue-400 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading
          ? <><span className="animate-spin">⚙</span> Generating...</>
          : <><Download className="h-3.5 w-3.5" /> Generate Report</>}
      </button>
    </div>
  );
}
