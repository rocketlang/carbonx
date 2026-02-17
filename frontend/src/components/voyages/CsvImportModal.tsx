import { useState, useRef } from 'react';
import { useMutation, gql } from '@apollo/client';
import { Upload, Download, X, CheckCircle, AlertCircle, Loader } from 'lucide-react';

const IMPORT_M = gql`
  mutation ImportVoyages($rows: JSON!) {
    importVoyages(rows: $rows) { imported errors }
  }
`;

interface ParsedRow { [key: string]: string }

// CSV column → field mapping (accepts multiple header variants)
const COLUMN_MAP: Record<string, string> = {
  'vessel_imo':              'vesselImo',
  'vessel imo':              'vesselImo',
  'imo':                     'vesselImo',
  'vessel_name':             'vesselName',
  'vessel name':             'vesselName',
  'vessel':                  'vesselName',
  'voyage_number':           'voyageNumber',
  'voyage number':           'voyageNumber',
  'voyage':                  'voyageNumber',
  'departure_port':          'departurePort',
  'departure port':          'departurePort',
  'departure':               'departurePort',
  'arrival_port':            'arrivalPort',
  'arrival port':            'arrivalPort',
  'arrival':                 'arrivalPort',
  'departure_country':       'departurePortCountry',
  'departure_port_country':  'departurePortCountry',
  'dep_country':             'departurePortCountry',
  'arrival_country':         'arrivalPortCountry',
  'arrival_port_country':    'arrivalPortCountry',
  'arr_country':             'arrivalPortCountry',
  'departure_at':            'departureAt',
  'departure date':          'departureAt',
  'dep_date':                'departureAt',
  'arrival_at':              'arrivalAt',
  'arrival date':            'arrivalAt',
  'arr_date':                'arrivalAt',
  'distance_nm':             'distanceNm',
  'distance nm':             'distanceNm',
  'distance':                'distanceNm',
  'hfo_consumed_mt':         'hfoConsumedMt',
  'hfo':                     'hfoConsumedMt',
  'mgo_consumed_mt':         'mgoConsumedMt',
  'mgo':                     'mgoConsumedMt',
  'lng_consumed_mt':         'lngConsumedMt',
  'lng':                     'lngConsumedMt',
  'methanol_consumed_mt':    'methanolConsumedMt',
  'methanol':                'methanolConsumedMt',
  'biofuel_consumed_mt':     'biofuelConsumedMt',
  'biofuel':                 'biofuelConsumedMt',
  'status':                  'status',
};

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];

  // detect delimiter
  const delim = lines[0].includes('\t') ? '\t' : ',';

  const rawHeaders = lines[0].split(delim).map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase());
  const mappedHeaders = rawHeaders.map((h) => COLUMN_MAP[h] ?? h);

  return lines.slice(1).map((line) => {
    const cols = line.split(delim).map((c) => c.trim().replace(/^"|"$/g, ''));
    const row: ParsedRow = {};
    mappedHeaders.forEach((h, i) => { row[h] = cols[i] ?? ''; });
    return row;
  }).filter((r) => Object.values(r).some((v) => v.trim()));
}

const SAMPLE_CSV = `vessel_imo,voyage_number,departure_port,arrival_port,departure_country,arrival_country,departure_at,arrival_at,distance_nm,hfo_consumed_mt,mgo_consumed_mt,lng_consumed_mt,status
9400791,V2025-SGRTM,Singapore,Rotterdam,SG,NL,2025-03-01T08:00:00,2025-03-21T14:00:00,8400,126,16.8,,completed
9743221,V2025-RTNYW,Rotterdam,New York,NL,US,2025-04-01T10:00:00,2025-04-15T06:00:00,3500,77,7,,completed`;

interface Props {
  onClose: () => void;
  onImported: () => void;
}

export function CsvImportModal({ onClose, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows]         = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [step, setStep]         = useState<'upload' | 'preview' | 'done'>('upload');
  const [result, setResult]     = useState<{ imported: number; errors: string[] } | null>(null);

  const [importVoyages, { loading }] = useMutation(IMPORT_M);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target?.result as string);
      setRows(parsed);
      setStep('preview');
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target?.result as string);
      setRows(parsed);
      setStep('preview');
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    try {
      const { data } = await importVoyages({ variables: { rows } });
      setResult(data.importVoyages);
      setStep('done');
      if (data.importVoyages.imported > 0) onImported();
    } catch (e: any) {
      setResult({ imported: 0, errors: [e.message] });
      setStep('done');
    }
  }

  function downloadSample() {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'carbonx-voyage-template.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const previewCols = rows[0] ? Object.keys(rows[0]).filter((k) => k !== '') : [];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-white">Import Voyages from CSV</h2>
            <p className="text-xs text-gray-500 mt-0.5">Bulk-import voyage fuel data from your fleet management system</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Step: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-700 hover:border-emerald-600 rounded-xl p-10 text-center cursor-pointer transition-colors"
              >
                <Upload className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-300 font-medium">Drop your CSV here, or click to browse</p>
                <p className="text-xs text-gray-600 mt-1">Supports CSV and TSV formats</p>
                <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={handleFile} />
              </div>

              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-300 mb-2">Required CSV columns</p>
                <div className="grid grid-cols-3 gap-1 text-xs text-gray-500 font-mono">
                  {['vessel_imo or vessel_name','voyage_number','departure_port','arrival_port',
                    'departure_country','arrival_country','departure_at','distance_nm',
                    'hfo_consumed_mt','mgo_consumed_mt'].map((c) => (
                    <span key={c} className="bg-gray-900 rounded px-2 py-0.5">{c}</span>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-2">Date format: ISO 8601 (e.g. 2025-03-01T08:00:00) · Country: 2-letter code</p>
              </div>

              <button
                onClick={downloadSample}
                className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <Download className="h-4 w-4" /> Download sample CSV template
              </button>
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                <span className="text-gray-300">Parsed <strong className="text-white">{rows.length}</strong> rows from <span className="font-mono text-gray-400">{fileName}</span></span>
              </div>

              {/* Preview table */}
              <div className="overflow-x-auto rounded-xl border border-gray-800">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="px-2 py-2 text-left text-gray-500 font-medium">#</th>
                      {previewCols.map((c) => (
                        <th key={c} className="px-2 py-2 text-left text-gray-500 font-medium whitespace-nowrap">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="px-2 py-1.5 text-gray-600">{i + 1}</td>
                        {previewCols.map((c) => (
                          <td key={c} className="px-2 py-1.5 text-gray-300 whitespace-nowrap max-w-[120px] truncate">{row[c]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 5 && (
                  <p className="text-xs text-gray-600 px-3 py-2 border-t border-gray-800">
                    … and {rows.length - 5} more rows
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleImport} disabled={loading || rows.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Import {rows.length} Voyages
                </button>
                <button onClick={() => setStep('upload')} className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors">
                  Change File
                </button>
              </div>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && result && (
            <div className="space-y-4">
              <div className={`flex items-center gap-3 p-4 rounded-xl ${result.imported > 0 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                {result.imported > 0 ? (
                  <CheckCircle className="h-6 w-6 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-red-400 shrink-0" />
                )}
                <div>
                  <p className="text-sm font-semibold text-white">
                    {result.imported > 0 ? `${result.imported} voyages imported successfully` : 'Import failed'}
                  </p>
                  {result.errors.length > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">{result.errors.length} rows skipped with errors</p>
                  )}
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="bg-gray-800 rounded-xl p-3 space-y-1 max-h-48 overflow-y-auto">
                  <p className="text-xs font-medium text-gray-400 mb-2">Errors</p>
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-400 font-mono">{e}</p>
                  ))}
                </div>
              )}

              <button onClick={onClose} className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
