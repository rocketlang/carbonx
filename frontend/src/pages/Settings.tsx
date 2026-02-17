import { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import {
  Settings as SettingsIcon, Ship, User, Building2,
  Plus, Check, AlertCircle, Key
} from 'lucide-react';
import { useAuth } from '../lib/auth.js';

const VESSELS_Q = gql`query SettingsVessels { vessels { id imo name type flag dwt gt yearBuilt } }`;

const CREATE_VESSEL_M = gql`
  mutation CreateVesselSettings(
    $imo: String! $name: String! $type: String! $flag: String!
    $dwt: Float! $gt: Float! $yearBuilt: Int! $enginePowerKw: Float
  ) {
    createVessel(imo: $imo, name: $name, type: $type, flag: $flag,
      dwt: $dwt, gt: $gt, yearBuilt: $yearBuilt, enginePowerKw: $enginePowerKw) {
      id imo name type
    }
  }
`;

const CHANGE_PW_M = gql`
  mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
    changePassword(currentPassword: $currentPassword, newPassword: $newPassword)
  }
`;

const VESSEL_TYPES = ['bulker','tanker','container','gas_carrier','ro_ro_cargo','lng_carrier','general_cargo'];
const FLAG_CODES   = ['IN','SG','MH','BS','PA','CY','MT','LR','HK','GB','NO','GR','NL'];

function SectionHeader({ icon: Icon, title, subtitle }: {
  icon: React.ElementType; title: string; subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="h-9 w-9 rounded-lg bg-gray-700 flex items-center justify-center">
        <Icon className="h-4.5 w-4.5 text-gray-300" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );
}

function FleetSection() {
  const { data, loading, refetch } = useQuery(VESSELS_Q);
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formErr, setFormErr] = useState('');

  const [form, setForm] = useState({
    imo: '', name: '', type: 'bulker', flag: 'SG',
    dwt: '', gt: '', yearBuilt: new Date().getFullYear().toString(), enginePowerKw: '',
  });

  const [createVessel, { loading: creating }] = useMutation(CREATE_VESSEL_M, {
    onCompleted: () => { refetch(); setOpen(false); setSaved(true); setFormErr(''); setForm({ imo: '', name: '', type: 'bulker', flag: 'SG', dwt: '', gt: '', yearBuilt: new Date().getFullYear().toString(), enginePowerKw: '' }); setTimeout(() => setSaved(false), 3000); },
    onError: (e) => setFormErr(e.message),
  });

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormErr('');
    createVessel({ variables: {
      imo: form.imo, name: form.name, type: form.type, flag: form.flag,
      dwt: Number(form.dwt), gt: Number(form.gt), yearBuilt: Number(form.yearBuilt),
      ...(form.enginePowerKw ? { enginePowerKw: Number(form.enginePowerKw) } : {}),
    }});
  }

  const inp = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500';

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <SectionHeader icon={Ship} title="Fleet Management" subtitle="Vessels registered under your organization" />
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-600/30 text-emerald-400 text-xs font-medium rounded-lg transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Add Vessel
        </button>
      </div>

      {saved && (
        <div className="mb-3 flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
          <Check className="h-4 w-4" /> Vessel added successfully
        </div>
      )}

      {/* Add vessel form */}
      {open && (
        <form onSubmit={handleAdd} className="mb-4 bg-gray-900 rounded-lg p-4 space-y-3 border border-gray-700">
          <p className="text-xs font-semibold text-gray-300 mb-2">New Vessel</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">IMO Number</label>
              <input className={inp} value={form.imo} onChange={(e) => setForm((f) => ({ ...f, imo: e.target.value }))} placeholder="9400791" required pattern="\d{7}" title="7-digit IMO number" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Vessel Name</label>
              <input className={inp} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="MV Example" required />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type</label>
              <select className={inp} value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                {VESSEL_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Flag</label>
              <select className={inp} value={form.flag} onChange={(e) => setForm((f) => ({ ...f, flag: e.target.value }))}>
                {FLAG_CODES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">DWT</label>
              <input className={inp} type="number" value={form.dwt} onChange={(e) => setForm((f) => ({ ...f, dwt: e.target.value }))} placeholder="76000" required min={1} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">GT</label>
              <input className={inp} type="number" value={form.gt} onChange={(e) => setForm((f) => ({ ...f, gt: e.target.value }))} placeholder="42000" required min={1} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Year Built</label>
              <input className={inp} type="number" value={form.yearBuilt} onChange={(e) => setForm((f) => ({ ...f, yearBuilt: e.target.value }))} placeholder="2010" required min={1990} max={new Date().getFullYear()} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Engine Power (kW) <span className="text-gray-600">optional</span></label>
              <input className={inp} type="number" value={form.enginePowerKw} onChange={(e) => setForm((f) => ({ ...f, enginePowerKw: e.target.value }))} placeholder="12500" min={100} />
            </div>
          </div>
          {formErr && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 rounded px-2 py-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {formErr}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={creating} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors">
              {creating ? 'Adding...' : 'Add Vessel'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-medium rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Fleet list */}
      {loading ? (
        <p className="text-sm text-gray-500">Loading fleet...</p>
      ) : (
        <div className="space-y-2">
          {(data?.vessels ?? []).map((v: any) => (
            <div key={v.id} className="flex items-center gap-3 bg-gray-900/50 rounded-lg px-3 py-2.5">
              <Ship className="h-4 w-4 text-gray-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-200 truncate">{v.name}</p>
                <p className="text-xs text-gray-500">IMO {v.imo} · {v.type} · {v.flag} · {(v.dwt/1000).toFixed(0)}k DWT</p>
              </div>
              <span className="text-xs text-gray-600 font-mono">{v.yearBuilt}</span>
            </div>
          ))}
          {data?.vessels?.length === 0 && (
            <p className="text-sm text-gray-600 text-center py-4">No vessels yet — add your first vessel above</p>
          )}
        </div>
      )}
    </div>
  );
}

function ProfileSection() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <SectionHeader icon={User} title="Profile" subtitle="Your account details" />
      <div className="space-y-3">
        {[
          { label: 'Name',            value: user.name },
          { label: 'Email',           value: user.email },
          { label: 'Role',            value: user.role },
          { label: 'Organization ID', value: user.organizationId },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center gap-3 text-sm">
            <span className="w-32 text-gray-500 shrink-0">{label}</span>
            <span className="text-gray-200 font-mono text-xs bg-gray-900 rounded px-2 py-1">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SecuritySection() {
  const [cur, setCur]   = useState('');
  const [pw, setPw]     = useState('');
  const [pw2, setPw2]   = useState('');
  const [msg, setMsg]   = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [changePw, { loading }] = useMutation(CHANGE_PW_M, {
    onCompleted: () => { setMsg({ type: 'ok', text: 'Password changed successfully' }); setCur(''); setPw(''); setPw2(''); },
    onError: (e) => setMsg({ type: 'err', text: e.message }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (pw !== pw2) { setMsg({ type: 'err', text: 'New passwords do not match' }); return; }
    if (pw.length < 8) { setMsg({ type: 'err', text: 'Password must be at least 8 characters' }); return; }
    changePw({ variables: { currentPassword: cur, newPassword: pw } });
  }

  const inp = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500';

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <SectionHeader icon={Key} title="Security" subtitle="Change your password" />
      <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Current Password</label>
          <input type="password" className={inp} value={cur} onChange={(e) => setCur(e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">New Password</label>
          <input type="password" className={inp} value={pw} onChange={(e) => setPw(e.target.value)} required minLength={8} placeholder="At least 8 characters" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Confirm New Password</label>
          <input type="password" className={inp} value={pw2} onChange={(e) => setPw2(e.target.value)} required />
        </div>
        {msg && (
          <div className={`flex items-center gap-2 text-xs rounded px-2 py-1.5 ${msg.type === 'ok' ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
            {msg.type === 'ok' ? <Check className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
            {msg.text}
          </div>
        )}
        <button type="submit" disabled={loading} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-200 text-xs font-semibold rounded-lg transition-colors">
          {loading ? 'Saving...' : 'Change Password'}
        </button>
      </form>
    </div>
  );
}

export function Settings() {
  const { user, logout } = useAuth();

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-gray-400" />
            Settings
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Organization: <span className="text-gray-300 font-mono text-xs">{user?.organizationId}</span>
          </p>
        </div>
        <button
          onClick={logout}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 text-sm rounded-lg transition-colors"
        >
          Sign Out
        </button>
      </div>

      <ProfileSection />
      <FleetSection />
      <SecuritySection />

      {/* Version info */}
      <div className="text-center text-xs text-gray-700 pb-4">
        CarbonX v1.0.0 · Maritime Carbon Compliance Suite · ANKR Labs
      </div>
    </div>
  );
}
