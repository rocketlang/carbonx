/**
 * FuelEU Maritime — GHG Intensity Calculator
 * Regulation (EU) 2023/1805 — effective Jan 2025
 *
 * Measure: GHG intensity of energy used on board (gCO2eq/MJ)
 * Well-to-wake emission factors per fuel type.
 */

// Well-to-wake GHG intensity factors (gCO2eq/MJ)
// Source: FuelEU Annex II (delegated act values)
export const WTW_FACTORS: Record<string, number> = {
  hfo:                93.3,
  lsfo:               91.7,
  mdo:                95.1,
  mgo:                95.1,
  lng_fossil:         91.2,
  lng_bio:            15.0,  // biomethane (varies)
  methanol_fossil:    94.0,
  methanol_green:     14.0,  // green methanol
  ammonia_fossil:    130.0,
  ammonia_green:       7.0,  // green ammonia
  biofuel_b30:        43.0,  // 30% bio blend
  e_fuel:              4.0,  // renewable e-fuel
  hydrogen_green:      2.0,
};

// Lower calorific values (MJ/tonne) for energy conversion
export const LCV_MJ_PER_TONNE: Record<string, number> = {
  hfo:                40_200,
  lsfo:               40_200,
  mdo:                42_700,
  mgo:                42_700,
  lng_fossil:         48_000,
  lng_bio:            48_000,
  methanol_fossil:    19_900,
  methanol_green:     19_900,
  ammonia_fossil:     18_600,
  ammonia_green:      18_600,
  biofuel_b30:        38_400,
  e_fuel:             40_000,
  hydrogen_green:    120_000,
};

// Annual GHG intensity targets (gCO2eq/MJ) — relative reduction from 2020 baseline
// Baseline: 91.16 gCO2eq/MJ
const BASELINE_GHG = 91.16;

export const FUELEU_TARGETS: Record<number, number> = {
  2025: BASELINE_GHG * (1 - 0.02),  // −2%
  2030: BASELINE_GHG * (1 - 0.06),  // −6%
  2035: BASELINE_GHG * (1 - 0.14),  // −14.5%
  2040: BASELINE_GHG * (1 - 0.31),  // −31%
  2045: BASELINE_GHG * (1 - 0.62),  // −62%
  2050: BASELINE_GHG * (1 - 0.80),  // −80%
};

export interface FuelEuFuelInput {
  type: keyof typeof WTW_FACTORS;
  metricTonnes: number;
}

export interface FuelEuInput {
  fuels: FuelEuFuelInput[];
  year: number;
}

export interface FuelEuResult {
  totalEnergyMj: number;
  actualGhgIntensity: number;    // gCO2eq/MJ achieved
  targetGhgIntensity: number;    // regulatory limit
  ghgGap: number;                // actual - target (positive = non-compliant)
  isCompliant: boolean;
  penaltyEur: number;            // €2,400 × shortfall MJ
}

/**
 * Calculate FuelEU GHG intensity and compliance for a vessel/period.
 */
export function calculateFuelEuCompliance(input: FuelEuInput): FuelEuResult {
  let totalEnergyMj = 0;
  let totalGhgGco2eq = 0;

  for (const fuel of input.fuels) {
    const lcv = LCV_MJ_PER_TONNE[fuel.type] ?? LCV_MJ_PER_TONNE.hfo;
    const wtwFactor = WTW_FACTORS[fuel.type] ?? WTW_FACTORS.hfo;
    const energyMj = fuel.metricTonnes * lcv;
    totalEnergyMj += energyMj;
    totalGhgGco2eq += energyMj * wtwFactor;
  }

  const actualGhgIntensity = totalEnergyMj > 0
    ? totalGhgGco2eq / totalEnergyMj
    : BASELINE_GHG;

  // Find applicable target (interpolate between defined years)
  const targetYear = Math.min(Math.max(input.year, 2025), 2050);
  const targetKeys = Object.keys(FUELEU_TARGETS).map(Number).sort((a, b) => a - b);
  const nearestKey = targetKeys.reduce((prev, curr) =>
    Math.abs(curr - targetYear) < Math.abs(prev - targetYear) ? curr : prev,
  );
  const targetGhgIntensity = FUELEU_TARGETS[nearestKey] ?? BASELINE_GHG;

  const ghgGap = actualGhgIntensity - targetGhgIntensity;
  const isCompliant = ghgGap <= 0;

  // Penalty: €2,400 per tonne shortfall converted to MJ shortfall
  // Shortfall (GJ) = gap (gCO2eq/MJ) × total energy (MJ) / 1e6
  const penaltyEur = isCompliant
    ? 0
    : (ghgGap * totalEnergyMj / 1_000_000) * 2400;

  return {
    totalEnergyMj,
    actualGhgIntensity,
    targetGhgIntensity,
    ghgGap,
    isCompliant,
    penaltyEur: Math.max(0, penaltyEur),
  };
}
