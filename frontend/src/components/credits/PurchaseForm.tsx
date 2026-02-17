/**
 * Purchase Carbon Credits Form
 */
import { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { Plus, CheckCircle } from 'lucide-react';

const PURCHASE = gql`
  mutation PurchaseCarbonCredits(
    $standard: String! $projectId: String! $projectName: String!
    $projectType: String! $country: String! $vintage: Int!
    $quantity: Float! $priceUsd: Float $registryUrl: String $serialNumber: String
  ) {
    purchaseCarbonCredits(
      standard: $standard projectId: $projectId projectName: $projectName
      projectType: $projectType country: $country vintage: $vintage
      quantity: $quantity priceUsd: $priceUsd registryUrl: $registryUrl
      serialNumber: $serialNumber
    ) {
      id projectName quantity standard
    }
  }
`;

const STANDARDS = [
  { value: 'gold_standard',            label: 'Gold Standard' },
  { value: 'verra_vcs',                label: 'Verra VCS' },
  { value: 'plan_vivo',                label: 'Plan Vivo' },
  { value: 'american_carbon_registry', label: 'American Carbon Registry (ACR)' },
  { value: 'climate_action_reserve',   label: 'Climate Action Reserve (CAR)' },
];

const PROJECT_TYPES = [
  { value: 'redd_plus',             label: 'REDD+ (Avoided Deforestation)' },
  { value: 'afforestation',         label: 'Afforestation / Reforestation' },
  { value: 'improved_forest',       label: 'Improved Forest Management' },
  { value: 'renewable_energy',      label: 'Renewable Energy' },
  { value: 'methane_capture',       label: 'Methane Capture' },
  { value: 'blue_carbon',           label: 'Blue Carbon (Mangroves/Seagrass)' },
  { value: 'clean_cookstoves',      label: 'Clean Cookstoves' },
  { value: 'direct_air_capture',    label: 'Direct Air Capture (DAC)' },
  { value: 'biochar',               label: 'Biochar' },
  { value: 'enhanced_weathering',   label: 'Enhanced Weathering' },
  { value: 'industrial_efficiency', label: 'Industrial Efficiency' },
  { value: 'ocean_alkalinity',      label: 'Ocean Alkalinity Enhancement' },
];

const BLANK = {
  standard:    'gold_standard',
  projectId:   '',
  projectName: '',
  projectType: 'redd_plus',
  country:     '',
  vintage:     new Date().getFullYear() - 1,
  quantity:    1000,
  priceUsd:    '',
  registryUrl: '',
  serialNumber:'',
};

interface Props { onSuccess: () => void }

export function PurchaseForm({ onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [purchase, { loading }] = useMutation(PURCHASE);

  function set(key: string, val: string | number) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await purchase({
      variables: {
        ...form,
        priceUsd:    form.priceUsd !== '' ? Number(form.priceUsd) : undefined,
        registryUrl: form.registryUrl || undefined,
        serialNumber:form.serialNumber || undefined,
      },
    });
    setForm(BLANK);
    setOpen(false);
    onSuccess();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <Plus className="h-4 w-4" /> Purchase Credits
      </button>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white text-sm flex items-center gap-2">
          <Plus className="h-4 w-4 text-emerald-400" />
          Add Carbon Credits to Portfolio
        </h3>
        <button onClick={() => setOpen(false)} className="text-xs text-gray-500 hover:text-gray-300">
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
        {/* Standard */}
        <div className="col-span-2 sm:col-span-1">
          <label className="text-gray-400 block mb-1">Standard *</label>
          <select
            value={form.standard}
            onChange={(e) => set('standard', e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
            required
          >
            {STANDARDS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Project type */}
        <div className="col-span-2 sm:col-span-1">
          <label className="text-gray-400 block mb-1">Project Type *</label>
          <select
            value={form.projectType}
            onChange={(e) => set('projectType', e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
            required
          >
            {PROJECT_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Country */}
        <div>
          <label className="text-gray-400 block mb-1">Country *</label>
          <input
            type="text"
            value={form.country}
            onChange={(e) => set('country', e.target.value)}
            placeholder="e.g. Kenya"
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
            required
          />
        </div>

        {/* Project name */}
        <div className="col-span-2">
          <label className="text-gray-400 block mb-1">Project Name *</label>
          <input
            type="text"
            value={form.projectName}
            onChange={(e) => set('projectName', e.target.value)}
            placeholder="e.g. Kariba REDD+ Forest Protection"
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
            required
          />
        </div>

        {/* Project ID */}
        <div>
          <label className="text-gray-400 block mb-1">Project ID *</label>
          <input
            type="text"
            value={form.projectId}
            onChange={(e) => set('projectId', e.target.value)}
            placeholder="e.g. VCS-1234"
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
            required
          />
        </div>

        {/* Vintage */}
        <div>
          <label className="text-gray-400 block mb-1">Vintage *</label>
          <input
            type="number"
            value={form.vintage}
            min={2000}
            max={new Date().getFullYear()}
            onChange={(e) => set('vintage', Number(e.target.value))}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
            required
          />
        </div>

        {/* Quantity */}
        <div>
          <label className="text-gray-400 block mb-1">Quantity (tCO₂e) *</label>
          <input
            type="number"
            value={form.quantity}
            min={1}
            step={1}
            onChange={(e) => set('quantity', Number(e.target.value))}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
            required
          />
        </div>

        {/* Price */}
        <div>
          <label className="text-gray-400 block mb-1">Price (USD/t)</label>
          <input
            type="number"
            value={form.priceUsd}
            min={0}
            step={0.5}
            onChange={(e) => set('priceUsd', e.target.value)}
            placeholder="e.g. 15.00"
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
          />
        </div>

        {/* Serial */}
        <div>
          <label className="text-gray-400 block mb-1">Serial Number</label>
          <input
            type="text"
            value={form.serialNumber}
            onChange={(e) => set('serialNumber', e.target.value)}
            placeholder="Registry serial"
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
          />
        </div>

        {/* Registry URL */}
        <div className="col-span-2 sm:col-span-1">
          <label className="text-gray-400 block mb-1">Registry URL</label>
          <input
            type="url"
            value={form.registryUrl}
            onChange={(e) => set('registryUrl', e.target.value)}
            placeholder="https://registry.verra.org/..."
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
          />
        </div>

        {/* Submit */}
        <div className="col-span-2 sm:col-span-3 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            {loading ? 'Adding...' : 'Add to Portfolio'}
          </button>
        </div>
      </form>
    </div>
  );
}
