import { useState, useEffect } from 'react';
import { useMutation, useQuery, gql } from '@apollo/client';
import { X, Save, Loader } from 'lucide-react';

const VESSELS_Q = gql`query VoyageFormVessels { vessels { id imo name type } }`;

const CREATE_M = gql`
  mutation CreateVoyage(
    $vesselId: String! $voyageNumber: String!
    $departurePort: String! $arrivalPort: String!
    $departurePortCountry: String! $arrivalPortCountry: String!
    $departureAt: DateTime! $arrivalAt: DateTime $distanceNm: Float!
    $hfoConsumedMt: Float $mgoConsumedMt: Float $lngConsumedMt: Float
    $methanolConsumedMt: Float $biofuelConsumedMt: Float $status: String
  ) {
    createVoyage(
      vesselId: $vesselId voyageNumber: $voyageNumber
      departurePort: $departurePort arrivalPort: $arrivalPort
      departurePortCountry: $departurePortCountry arrivalPortCountry: $arrivalPortCountry
      departureAt: $departureAt arrivalAt: $arrivalAt distanceNm: $distanceNm
      hfoConsumedMt: $hfoConsumedMt mgoConsumedMt: $mgoConsumedMt lngConsumedMt: $lngConsumedMt
      methanolConsumedMt: $methanolConsumedMt biofuelConsumedMt: $biofuelConsumedMt status: $status
    ) { id voyageNumber departurePort arrivalPort departureAt co2EmissionsMt etsScope }
  }
`;

const UPDATE_M = gql`
  mutation UpdateVoyage(
    $id: String! $voyageNumber: String
    $departurePort: String $arrivalPort: String
    $departurePortCountry: String $arrivalPortCountry: String
    $departureAt: DateTime $arrivalAt: DateTime $distanceNm: Float
    $hfoConsumedMt: Float $mgoConsumedMt: Float $lngConsumedMt: Float
    $methanolConsumedMt: Float $biofuelConsumedMt: Float $status: String
  ) {
    updateVoyage(
      id: $id voyageNumber: $voyageNumber
      departurePort: $departurePort arrivalPort: $arrivalPort
      departurePortCountry: $departurePortCountry arrivalPortCountry: $arrivalPortCountry
      departureAt: $departureAt arrivalAt: $arrivalAt distanceNm: $distanceNm
      hfoConsumedMt: $hfoConsumedMt mgoConsumedMt: $mgoConsumedMt lngConsumedMt: $lngConsumedMt
      methanolConsumedMt: $methanolConsumedMt biofuelConsumedMt: $biofuelConsumedMt status: $status
    ) { id voyageNumber departurePort arrivalPort co2EmissionsMt etsScope }
  }
`;

export interface VoyageRow {
  id: string;
  vesselId: string;
  voyageNumber: string;
  departurePort: string;
  arrivalPort: string;
  departurePortCountry: string;
  arrivalPortCountry: string;
  departureAt: string;
  arrivalAt?: string;
  distanceNm: number;
  hfoConsumedMt: number;
  mgoConsumedMt: number;
  lngConsumedMt: number;
  methanolConsumedMt: number;
  biofuelConsumedMt: number;
  co2EmissionsMt: number;
  etsScope: string;
  status: string;
}

interface Props {
  voyage?: VoyageRow;
  defaultVesselId?: string;
  onClose: () => void;
  onSaved: () => void;
}

const STATUSES = ['planned','in_progress','completed','verified'];
const inp = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500';
const label = 'block text-xs text-gray-500 mb-1';

function toDatetimeLocal(iso?: string): string {
  if (!iso) return '';
  return iso.slice(0, 16);
}

export function VoyageForm({ voyage, defaultVesselId, onClose, onSaved }: Props) {
  const isEdit = !!voyage;
  const { data: vesselData } = useQuery(VESSELS_Q);
  const vessels = vesselData?.vessels ?? [];

  const [form, setForm] = useState({
    vesselId:             voyage?.vesselId             ?? defaultVesselId ?? '',
    voyageNumber:         voyage?.voyageNumber         ?? '',
    departurePort:        voyage?.departurePort        ?? '',
    arrivalPort:          voyage?.arrivalPort          ?? '',
    departurePortCountry: voyage?.departurePortCountry ?? '',
    arrivalPortCountry:   voyage?.arrivalPortCountry   ?? '',
    departureAt:          toDatetimeLocal(voyage?.departureAt),
    arrivalAt:            toDatetimeLocal(voyage?.arrivalAt),
    distanceNm:           String(voyage?.distanceNm ?? ''),
    hfoConsumedMt:        String(voyage?.hfoConsumedMt    ?? ''),
    mgoConsumedMt:        String(voyage?.mgoConsumedMt    ?? ''),
    lngConsumedMt:        String(voyage?.lngConsumedMt    ?? ''),
    methanolConsumedMt:   String(voyage?.methanolConsumedMt ?? ''),
    biofuelConsumedMt:    String(voyage?.biofuelConsumedMt  ?? ''),
    status:               voyage?.status ?? 'completed',
  });

  const [err, setErr] = useState('');
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const [createVoyage, { loading: c }] = useMutation(CREATE_M);
  const [updateVoyage, { loading: u }] = useMutation(UPDATE_M);
  const loading = c || u;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    const vars = {
      vesselId:             form.vesselId,
      voyageNumber:         form.voyageNumber,
      departurePort:        form.departurePort,
      arrivalPort:          form.arrivalPort,
      departurePortCountry: form.departurePortCountry.toUpperCase(),
      arrivalPortCountry:   form.arrivalPortCountry.toUpperCase(),
      departureAt:          new Date(form.departureAt).toISOString(),
      arrivalAt:            form.arrivalAt ? new Date(form.arrivalAt).toISOString() : undefined,
      distanceNm:           Number(form.distanceNm),
      hfoConsumedMt:        form.hfoConsumedMt      ? Number(form.hfoConsumedMt)      : undefined,
      mgoConsumedMt:        form.mgoConsumedMt      ? Number(form.mgoConsumedMt)      : undefined,
      lngConsumedMt:        form.lngConsumedMt      ? Number(form.lngConsumedMt)      : undefined,
      methanolConsumedMt:   form.methanolConsumedMt ? Number(form.methanolConsumedMt) : undefined,
      biofuelConsumedMt:    form.biofuelConsumedMt  ? Number(form.biofuelConsumedMt)  : undefined,
      status:               form.status,
    };

    try {
      if (isEdit) {
        await updateVoyage({ variables: { id: voyage!.id, ...vars } });
      } else {
        await createVoyage({ variables: vars });
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setErr(e.message?.replace('GraphQL error: ', '') || 'Failed to save');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-base font-semibold text-white">
            {isEdit ? 'Edit Voyage' : 'Log New Voyage'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Vessel + number */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Vessel</label>
              <select className={inp} value={form.vesselId} onChange={(e) => set('vesselId', e.target.value)} required disabled={isEdit}>
                <option value="">Select vessel…</option>
                {vessels.map((v: any) => (
                  <option key={v.id} value={v.id}>{v.name} ({v.type})</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Voyage Number</label>
              <input className={inp} value={form.voyageNumber} onChange={(e) => set('voyageNumber', e.target.value)} placeholder="V2025-SGRTM" required />
            </div>
          </div>

          {/* Ports */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Departure Port</label>
              <input className={inp} value={form.departurePort} onChange={(e) => set('departurePort', e.target.value)} placeholder="Singapore" required />
            </div>
            <div>
              <label className={label}>Dep. Country Code</label>
              <input className={`${inp} uppercase`} value={form.departurePortCountry} onChange={(e) => set('departurePortCountry', e.target.value.toUpperCase().slice(0,2))} placeholder="SG" maxLength={2} required />
            </div>
            <div>
              <label className={label}>Arrival Port</label>
              <input className={inp} value={form.arrivalPort} onChange={(e) => set('arrivalPort', e.target.value)} placeholder="Rotterdam" required />
            </div>
            <div>
              <label className={label}>Arr. Country Code</label>
              <input className={`${inp} uppercase`} value={form.arrivalPortCountry} onChange={(e) => set('arrivalPortCountry', e.target.value.toUpperCase().slice(0,2))} placeholder="NL" maxLength={2} required />
            </div>
          </div>

          {/* Dates + distance */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={label}>Departure</label>
              <input type="datetime-local" className={inp} value={form.departureAt} onChange={(e) => set('departureAt', e.target.value)} required />
            </div>
            <div>
              <label className={label}>Arrival <span className="text-gray-600">(opt.)</span></label>
              <input type="datetime-local" className={inp} value={form.arrivalAt} onChange={(e) => set('arrivalAt', e.target.value)} />
            </div>
            <div>
              <label className={label}>Distance (nm)</label>
              <input type="number" className={inp} value={form.distanceNm} onChange={(e) => set('distanceNm', e.target.value)} placeholder="8400" required min={1} />
            </div>
          </div>

          {/* Fuel consumption */}
          <div>
            <p className="text-xs font-medium text-gray-400 mb-2">Fuel Consumption (metric tonnes)</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'hfoConsumedMt',      label: 'HFO / VLSFO' },
                { key: 'mgoConsumedMt',      label: 'MGO / LSMGO' },
                { key: 'lngConsumedMt',      label: 'LNG' },
                { key: 'methanolConsumedMt', label: 'Methanol' },
                { key: 'biofuelConsumedMt',  label: 'Biofuel' },
              ].map(({ key, label: lbl }) => (
                <div key={key}>
                  <label className={label}>{lbl}</label>
                  <input type="number" className={inp} value={(form as any)[key]}
                    onChange={(e) => set(key, e.target.value)} placeholder="0" min={0} step={0.001} />
                </div>
              ))}
              <div>
                <label className={label}>Status</label>
                <select className={inp} value={form.status} onChange={(e) => set('status', e.target.value)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-600">
            ETS scope (EU-EU / EU-non-EU / none) is auto-detected from country codes. CO₂ is auto-calculated.
          </p>

          {err && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-red-400">
              {err}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={loading} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
              {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isEdit ? 'Save Changes' : 'Log Voyage'}
            </button>
            <button type="button" onClick={onClose} className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
