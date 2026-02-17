/**
 * EEXI Pure Calculation Functions
 * IMO MARPOL Annex VI — Resolution MEPC.333(76)
 * Mandatory from 1 November 2022
 *
 * Scope: existing ships ≥400 GT on international voyages
 * Metric: Energy Efficiency Existing Ship Index (gCO₂/t·nm)
 * One-time certification (not annual like CII)
 *
 * All functions are pure (no side effects, no DB).
 */

// ─────────────────────────────────────────────
// EEXI REFERENCE LINE PARAMETERS
// Source: MEPC.333(76) Reg. 26 — a × Capacity^(-c)
// Same structure as EEDI reference lines
// ─────────────────────────────────────────────

interface EexiRefParams {
  a: number;    // coefficient
  c: number;    // exponent
  reductionPct: number;  // % below reference line
  capacityField: 'dwt' | 'gt';
}

export const EEXI_REFERENCE_PARAMS: Record<string, EexiRefParams> = {
  bulker:          { a: 961.79,  c: 0.477,  reductionPct: 20, capacityField: 'dwt' },
  tanker:          { a: 1218.80, c: 0.488,  reductionPct: 20, capacityField: 'dwt' },
  container:       { a: 174.22,  c: 0.201,  reductionPct: 20, capacityField: 'dwt' },
  gas_carrier:     { a: 2253.70, c: 0.0,    reductionPct: 30, capacityField: 'dwt' },
  lng_carrier:     { a: 2253.70, c: 0.0,    reductionPct: 30, capacityField: 'dwt' },
  ro_ro_cargo:     { a: 1405.10, c: 0.498,  reductionPct: 15, capacityField: 'dwt' },
  ro_ro_vehicle:   { a: 1405.10, c: 0.498,  reductionPct: 15, capacityField: 'dwt' },
  general_cargo:   { a: 588.68,  c: 0.3885, reductionPct: 10, capacityField: 'dwt' },
  refrigerated:    { a: 731.74,  c: 0.120,  reductionPct: 15, capacityField: 'dwt' },
  cruise_passenger:{ a: 930.0,   c: 0.0,    reductionPct: 30, capacityField: 'gt'  },
};

// ─────────────────────────────────────────────
// CO2 CONVERSION FACTORS (gCO2 / g fuel)
// Source: MARPOL Annex VI, Table 1 of Resolution MEPC.333(76)
// ─────────────────────────────────────────────

export const EEXI_CF: Record<string, number> = {
  hfo:      3.1144,
  vlsfo:    3.1144,
  mgo:      3.2060,
  mdo:      3.2060,
  lng:      2.7500,
  lpg:      3.0300,
  methanol: 1.3750,
  ethanol:  1.9130,
};

// ─────────────────────────────────────────────
// SPECIFIC FUEL CONSUMPTION DEFAULTS (g/kWh)
// Source: NOx Technical Code — Table 1 defaults for EEXI
// Used when SFOC certificate not available
// ─────────────────────────────────────────────

export const EEXI_SFC_DEFAULTS: Record<string, number> = {
  // Two-stroke slow-speed diesel (main propulsion)
  two_stroke_hfo:   175,
  two_stroke_mgo:   175,
  // Four-stroke medium-speed diesel (often auxiliary / coasters)
  four_stroke_hfo:  195,
  four_stroke_mgo:  195,
  // Dual-fuel engines
  dual_fuel_lng:    145,
  dual_fuel_mdo:    180,
  // Gas turbine
  gas_turbine:      215,
};

// ─────────────────────────────────────────────
// CAPACITY (transport work denominator)
// ─────────────────────────────────────────────

export function getEexiCapacity(vessel: {
  type: string;
  dwt: number;
  gt: number;
}): number {
  const params = EEXI_REFERENCE_PARAMS[vessel.type];
  if (!params) return vessel.dwt;
  return params.capacityField === 'gt' ? vessel.gt : vessel.dwt;
}

// ─────────────────────────────────────────────
// REQUIRED EEXI (reference line × reduction)
// ─────────────────────────────────────────────

export function calculateRequiredEexi(
  vesselType: string,
  capacity: number,
): number {
  const params = EEXI_REFERENCE_PARAMS[vesselType] ?? EEXI_REFERENCE_PARAMS.bulker;
  const referenceLine = params.c === 0
    ? params.a                     // flat line (LNG, gas carriers)
    : params.a * Math.pow(capacity, -params.c);
  return referenceLine * (1 - params.reductionPct / 100);
}

// ─────────────────────────────────────────────
// ATTAINED EEXI
// Source: MEPC.333(76) Regulation 27
//
// EEXI = (CF_ME × SFC_ME × P_ME_75) / (Capacity × V_ref)
//
// Where:
//   P_ME_75  = 0.75 × MCR_ME  (kW)  — 75% main engine power
//   V_ref    = design/service speed at P_ME_75 (knots)
//   CF_ME    = CO2 conversion factor for main engine fuel
//   SFC_ME   = specific fuel consumption (g/kWh)
//   Capacity = DWT or GT per ship type
//
// Units: g / (t · nm) = gCO2 per deadweight-tonne per nautical mile
// ─────────────────────────────────────────────

export interface EexiInput {
  vesselType: string;
  dwt: number;
  gt: number;
  mcrKw: number;           // Main engine MCR (kW)
  designSpeedKn: number;   // Design speed at 75% MCR (knots)
  fuelType?: string;       // Main engine fuel (default: 'hfo')
  sfcGkWh?: number;        // Specific fuel consumption (g/kWh); default from lookup
  fwFactor?: number;       // Minimum propulsion power correction (0.83–1.0, default 1.0)
  eplFraction?: number;    // Engine Power Limitation applied (fraction of MCR, 0–1)
}

export function calculateAttainedEexi(input: EexiInput): {
  attainedEexi: number;
  pMe75Kw: number;
  cfMe: number;
  sfcGkWh: number;
  capacity: number;
} {
  const {
    vesselType, dwt, gt, mcrKw, designSpeedKn,
    fuelType = 'hfo',
    sfcGkWh,
    fwFactor = 1.0,
    eplFraction = 1.0,
  } = input;

  const capacity = getEexiCapacity({ type: vesselType, dwt, gt });
  const cfMe = EEXI_CF[fuelType] ?? EEXI_CF.hfo;

  // Use provided SFC or fall back to engine-type defaults
  const sfc = sfcGkWh ??
    (fuelType === 'lng' ? EEXI_SFC_DEFAULTS.dual_fuel_lng : EEXI_SFC_DEFAULTS.two_stroke_hfo);

  // Apply EPL if set (reduces effective MCR used in EEXI calculation)
  const effectiveMcr = mcrKw * Math.min(1.0, eplFraction);
  const pMe75Kw = 0.75 * effectiveMcr * fwFactor;

  // EEXI = (CF × SFC × P_ME_75) / (Capacity × V_ref)
  // Units: g/kWh × g_CO2/g_fuel × kW → gCO2/h; divided by (t × nm/h) → gCO2/(t·nm)
  const attainedEexi = (cfMe * sfc * pMe75Kw) / (capacity * designSpeedKn);

  return { attainedEexi, pMe75Kw, cfMe, sfcGkWh: sfc, capacity };
}

// ─────────────────────────────────────────────
// ENGINE POWER LIMITATION (EPL)
// Source: MEPC.333(76) Regulation 27.3
//
// If attained EEXI > required, calculate the EPL (fraction of MCR)
// that would bring attained EEXI down to the required level.
//
// Since EEXI ∝ P_ME_75, the required EPL fraction is:
//   EPL_fraction = requiredEexi / attainedEexi_without_EPL
//   Speed penalty ≈ EPL_fraction^(1/3) (cubic law)
// ─────────────────────────────────────────────

export function calculateEpl(
  attainedEexi: number,
  requiredEexi: number,
): {
  eplFraction: number;      // fraction of MCR to achieve compliance (0–1)
  speedPenaltyPct: number;  // estimated speed reduction (%)
} {
  if (attainedEexi <= requiredEexi) {
    return { eplFraction: 1.0, speedPenaltyPct: 0 };
  }
  const eplFraction = requiredEexi / attainedEexi;
  // Speed ∝ P^(1/3): V_limited / V_design = (P_limited/P_design)^(1/3) = eplFraction^(1/3)
  const speedRatio = Math.pow(eplFraction, 1 / 3);
  const speedPenaltyPct = (1 - speedRatio) * 100;
  return { eplFraction, speedPenaltyPct };
}

// ─────────────────────────────────────────────
// FULL COMPLIANCE RECORD
// ─────────────────────────────────────────────

export interface EexiComplianceResult {
  attainedEexi: number;
  requiredEexi: number;
  eexiGap: number;          // attained - required (positive = non-compliant)
  isCompliant: boolean;
  eplFraction: number;
  speedPenaltyPct: number;
  pMe75Kw: number;
  capacity: number;
  reductionPct: number;
}

export function calculateEexiCompliance(input: EexiInput): EexiComplianceResult {
  const capacity = getEexiCapacity({ type: input.vesselType, dwt: input.dwt, gt: input.gt });
  const requiredEexi = calculateRequiredEexi(input.vesselType, capacity);
  const { attainedEexi, pMe75Kw } = calculateAttainedEexi(input);
  const eexiGap = attainedEexi - requiredEexi;
  const isCompliant = eexiGap <= 0;
  const { eplFraction, speedPenaltyPct } = calculateEpl(attainedEexi, requiredEexi);
  const params = EEXI_REFERENCE_PARAMS[input.vesselType] ?? EEXI_REFERENCE_PARAMS.bulker;

  return {
    attainedEexi,
    requiredEexi,
    eexiGap,
    isCompliant,
    eplFraction,
    speedPenaltyPct,
    pMe75Kw,
    capacity,
    reductionPct: params.reductionPct,
  };
}

// ─────────────────────────────────────────────
// FLEET SUMMARY
// ─────────────────────────────────────────────

export function getEexiFleetSummary(records: Array<{
  isCompliant: boolean;
  attainedEexi: number | null;
  requiredEexi: number | null;
}>): {
  totalVessels: number;
  compliantVessels: number;
  nonCompliantVessels: number;
  pendingCertification: number;
  avgEexiRatio: number;
} {
  const certified = records.filter((r) => r.attainedEexi != null && r.requiredEexi != null);
  const compliantVessels = certified.filter((r) => r.isCompliant).length;
  const nonCompliantVessels = certified.filter((r) => !r.isCompliant).length;
  const pendingCertification = records.length - certified.length;

  const avgEexiRatio = certified.length > 0
    ? certified.reduce((s, r) => {
        const ratio = r.requiredEexi! > 0 ? r.attainedEexi! / r.requiredEexi! : 1;
        return s + ratio;
      }, 0) / certified.length
    : 0;

  return {
    totalVessels: records.length,
    compliantVessels,
    nonCompliantVessels,
    pendingCertification,
    avgEexiRatio,
  };
}
