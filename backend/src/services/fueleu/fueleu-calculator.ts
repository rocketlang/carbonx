/**
 * FuelEU Maritime Pure Calculation Functions
 * Regulation (EU) 2023/1805 — effective 1 January 2025
 *
 * Scope: vessels ≥5,000 GT on international voyages
 * Metric: Well-to-Wake (WtW) GHG intensity (gCO2eq/MJ of energy used)
 * Penalty: €2,400 per tonne VLSFO-equivalent of shortfall
 *
 * All functions are pure (no side effects, no DB).
 */

// ─────────────────────────────────────────────
// FUEL WELL-TO-WAKE GHG FACTORS (gCO2eq/MJ)
// Source: Regulation (EU) 2023/1805 — Annex I & II
// WtW = Well-to-Tank (WtT) + Tank-to-Wake (TtW)
// ─────────────────────────────────────────────

export const FUEL_WTW_GHG: Record<string, number> = {
  hfo:             91.16,  // HFO / VLSFO — 2020 baseline reference fuel
  mgo:             89.0,   // MGO / MDO distillate
  lng_otto:        75.4,   // LNG — Otto dual-fuel (lower methane slip)
  lng_diesel:      73.0,   // LNG — Low-pressure diesel cycle
  methanol_fossil: 85.1,   // Fossil methanol
  methanol_bio:     9.9,   // Bio-methanol (certified renewable pathway)
  bio_lng:         14.9,   // Bio-LNG (certified biomethane)
  biofuel:         18.0,   // Biofuel blends (default sustainable avg)
  ammonia_green:    5.0,   // Green ammonia (electrolytic)
  h2_green:         4.8,   // Green hydrogen (electrolytic)
  e_ammonia:        3.5,   // e-Ammonia (power-to-X)
};

// Lower Heating Values (LHV) by fuel — MJ/tonne
// Used to convert mass-based fuel consumption to energy (MJ)
export const FUEL_LHV_MJ_PER_TONNE: Record<string, number> = {
  hfo:             40_200,
  mgo:             42_700,
  lng_otto:        48_000,
  lng_diesel:      48_000,
  methanol_fossil: 19_900,
  methanol_bio:    19_900,
  bio_lng:         48_000,
  biofuel:         37_000,
  ammonia_green:   18_600,
  h2_green:       120_000,
  e_ammonia:       18_600,
};

// 2020 reference value for GHG intensity (VLSFO, gCO2eq/MJ)
export const FUELEU_BASELINE_GGHG = 91.16;

// ─────────────────────────────────────────────
// GHG INTENSITY TARGETS BY YEAR
// Source: Article 4 of Regulation (EU) 2023/1805
// Reduction vs 2020 baseline (91.16 gCO2eq/MJ)
// ─────────────────────────────────────────────

const FUELEU_TARGETS: Array<{ from: number; to: number; reductionPct: number }> = [
  { from: 2025, to: 2029, reductionPct: 2   },   // -2%    → 89.34
  { from: 2030, to: 2034, reductionPct: 6   },   // -6%    → 85.69
  { from: 2035, to: 2039, reductionPct: 14.5 },  // -14.5% → 77.94
  { from: 2040, to: 2044, reductionPct: 31  },   // -31%   → 62.90
  { from: 2045, to: 2049, reductionPct: 62  },   // -62%   → 34.64
  { from: 2050, to: 9999, reductionPct: 80  },   // -80%   → 18.23
];

export function getTargetGhgIntensity(year: number): number {
  if (year < 2025) return FUELEU_BASELINE_GGHG; // No obligation before 2025
  const band = FUELEU_TARGETS.find((t) => year >= t.from && year <= t.to);
  const reduction = band?.reductionPct ?? 80;
  return FUELEU_BASELINE_GGHG * (1 - reduction / 100);
}

// ─────────────────────────────────────────────
// ENERGY CALCULATION
// ─────────────────────────────────────────────

export interface FuelConsumption {
  hfoMt?:            number;
  mgoMt?:            number;
  lngMt?:            number;
  lngDieselMt?:      number;
  methanolMt?:       number;
  methanolBioMt?:    number;
  bioLngMt?:         number;
  biofuelMt?:        number;
  ammoniaGreenMt?:   number;
  h2GreenMt?:        number;
}

interface FuelContribution {
  fuelType: string;
  massMt: number;
  energyMj: number;
  ghgFactor: number;
  ghgContributionGco2eq: number;
}

export function calcFuelContributions(consumption: FuelConsumption): FuelContribution[] {
  const pairs: Array<[string, number | undefined]> = [
    ['hfo',             consumption.hfoMt],
    ['mgo',             consumption.mgoMt],
    ['lng_otto',        consumption.lngMt],
    ['lng_diesel',      consumption.lngDieselMt],
    ['methanol_fossil', consumption.methanolMt],
    ['methanol_bio',    consumption.methanolBioMt],
    ['bio_lng',         consumption.bioLngMt],
    ['biofuel',         consumption.biofuelMt],
    ['ammonia_green',   consumption.ammoniaGreenMt],
    ['h2_green',        consumption.h2GreenMt],
  ];

  return pairs
    .filter(([, mass]) => mass && mass > 0)
    .map(([fuelType, massMt]) => {
      const energyMj = (massMt ?? 0) * (FUEL_LHV_MJ_PER_TONNE[fuelType] ?? 40_200);
      const ghgFactor = FUEL_WTW_GHG[fuelType] ?? 91.16;
      return {
        fuelType,
        massMt: massMt ?? 0,
        energyMj,
        ghgFactor,
        ghgContributionGco2eq: energyMj * ghgFactor,
      };
    });
}

// ─────────────────────────────────────────────
// GHG INTENSITY CALCULATION
// ─────────────────────────────────────────────

export function calculateGhgIntensity(consumption: FuelConsumption): {
  totalEnergyMj: number;
  totalGhgGco2eq: number;
  actualGhgIntensity: number;
  contributions: FuelContribution[];
} {
  const contributions = calcFuelContributions(consumption);
  const totalEnergyMj = contributions.reduce((s, c) => s + c.energyMj, 0);
  const totalGhgGco2eq = contributions.reduce((s, c) => s + c.ghgContributionGco2eq, 0);
  const actualGhgIntensity = totalEnergyMj > 0 ? totalGhgGco2eq / totalEnergyMj : FUELEU_BASELINE_GGHG;

  return { totalEnergyMj, totalGhgGco2eq, actualGhgIntensity, contributions };
}

// ─────────────────────────────────────────────
// PENALTY CALCULATION
// Source: Article 23 — €2,400 per tonne VLSFO shortfall
// VLSFO LHV = 40,200 MJ/tonne
// penalty = ghg_gap(gCO2eq/MJ) × energy(MJ) / (baseline × VLSFO_LHV) × 2400
// ─────────────────────────────────────────────

const PENALTY_PER_TONNE_VLSFO = 2_400;   // EUR
const VLSFO_LHV = 40_200;                 // MJ/tonne

export function calculatePenalty(
  ghgGap: number,       // actual - target, gCO2eq/MJ (positive = non-compliant)
  totalEnergyMj: number,
): number {
  if (ghgGap <= 0) return 0;
  // shortfall in VLSFO-equivalent tonnes
  const shortfallVlsfoTonnes = (ghgGap * totalEnergyMj) / (FUELEU_BASELINE_GGHG * VLSFO_LHV);
  return shortfallVlsfoTonnes * PENALTY_PER_TONNE_VLSFO;
}

// ─────────────────────────────────────────────
// POOLING: surplus / deficit in MJ
// Source: Article 6 — compliance pooling
// ─────────────────────────────────────────────

export function calculatePoolBalance(
  actualGhgIntensity: number,
  targetGhgIntensity: number,
  totalEnergyMj: number,
): number {
  // Positive = surplus (over-compliant), negative = deficit
  const gap = targetGhgIntensity - actualGhgIntensity; // reversed: surplus when actual < target
  return gap * totalEnergyMj; // gCO2eq — can be traded as pool MJ equivalent
}

// ─────────────────────────────────────────────
// FULL COMPLIANCE RECORD
// ─────────────────────────────────────────────

export interface FuelEuComplianceResult {
  year: number;
  totalEnergyMj: number;
  actualGhgIntensity: number;
  targetGhgIntensity: number;
  ghgGap: number;
  isCompliant: boolean;
  penaltyEur: number;
  poolBalanceMj: number;
  fuelMix: FuelContribution[];
  greenFuelPct: number;  // % energy from bio/e-fuels
}

const GREEN_FUELS = new Set(['methanol_bio', 'bio_lng', 'biofuel', 'ammonia_green', 'h2_green', 'e_ammonia']);

export function calculateFuelEuCompliance(
  year: number,
  consumption: FuelConsumption,
): FuelEuComplianceResult {
  const { totalEnergyMj, actualGhgIntensity, contributions } = calculateGhgIntensity(consumption);
  const targetGhgIntensity = getTargetGhgIntensity(year);
  const ghgGap = actualGhgIntensity - targetGhgIntensity;
  const isCompliant = ghgGap <= 0;
  const penaltyEur = calculatePenalty(ghgGap, totalEnergyMj);
  const poolBalanceMj = calculatePoolBalance(actualGhgIntensity, targetGhgIntensity, totalEnergyMj);

  const greenEnergyMj = contributions
    .filter((c) => GREEN_FUELS.has(c.fuelType))
    .reduce((s, c) => s + c.energyMj, 0);
  const greenFuelPct = totalEnergyMj > 0 ? (greenEnergyMj / totalEnergyMj) * 100 : 0;

  return {
    year,
    totalEnergyMj,
    actualGhgIntensity,
    targetGhgIntensity,
    ghgGap,
    isCompliant,
    penaltyEur,
    poolBalanceMj,
    fuelMix: contributions,
    greenFuelPct,
  };
}

// ─────────────────────────────────────────────
// ROUTE VOYAGE CONSUMPTION from a Voyage record
// ─────────────────────────────────────────────

export function voyageToConsumption(voyage: {
  hfoConsumedMt: number;
  mgoConsumedMt: number;
  lngConsumedMt: number;
  methanolConsumedMt: number;
  biofuelConsumedMt: number;
}): FuelConsumption {
  return {
    hfoMt:       voyage.hfoConsumedMt,
    mgoMt:       voyage.mgoConsumedMt,
    lngMt:       voyage.lngConsumedMt,
    methanolMt:  voyage.methanolConsumedMt,
    biofuelMt:   voyage.biofuelConsumedMt,
  };
}
