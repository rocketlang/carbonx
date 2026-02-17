/**
 * CII Pure Calculation Functions
 * IMO MARPOL Annex VI — Resolution MEPC.337(76) + MEPC.354(78)
 *
 * All functions are pure (no side effects, no DB).
 * Safe for unit testing and "what-if" simulations.
 */

// ─────────────────────────────────────────────
// REFERENCE LINE PARAMETERS
// Source: MEPC.339(76) — a × DWT^(-c)
// ─────────────────────────────────────────────

export const CII_REFERENCE_PARAMS: Record<string, { a: number; c: number }> = {
  bulker:            { a: 4745,   c: 0.622  },
  tanker:            { a: 5247,   c: 0.610  },
  container:         { a: 1984,   c: 0.489  },
  gas_carrier:       { a: 144.0,  c: 0.0    },
  ro_ro_cargo:       { a: 5739,   c: 0.631  },
  ro_ro_vehicle:     { a: 5739,   c: 0.631  },
  lng_carrier:       { a: 9827,   c: 0.0    },
  cruise_passenger:  { a: 930.0,  c: 0.0    },
  general_cargo:     { a: 31948,  c: 0.792  },
  refrigerated:      { a: 4600,   c: 0.557  },
};

// ─────────────────────────────────────────────
// ANNUAL REDUCTION FACTORS vs 2019 BASELINE
// Source: MEPC.338(76) Table 1
// ─────────────────────────────────────────────

export const CII_REDUCTION_FACTORS: Record<number, number> = {
  2019: 1.00,
  2020: 1.01,  // Baseline year
  2021: 1.01,
  2022: 1.00,
  2023: 0.95,
  2024: 0.93,
  2025: 0.91,
  2026: 0.89,
  // 2027–2030 TBD by IMO (assumed to continue −2% per year)
  2027: 0.87,
  2028: 0.85,
  2029: 0.83,
  2030: 0.81,
};

// ─────────────────────────────────────────────
// RATING BOUNDARY (dd) VECTORS
// Source: MEPC.354(78) — per ship type
// Rating = compared to exp(d[i]) × required CII
//
// A: attained < exp(d1) × required
// B: exp(d1) ≤ attained < exp(d2) × required
// C: exp(d2) ≤ attained < exp(d3) × required
// D: exp(d3) ≤ attained < exp(d4) × required
// E: attained ≥ exp(d4) × required
// ─────────────────────────────────────────────

interface DdVector { d1: number; d2: number; d3: number; d4: number }

export const CII_DD_VECTORS: Record<string, DdVector> = {
  bulker:            { d1: -0.39, d2: -0.23, d3: 0.15, d4: 0.29 },
  tanker:            { d1: -0.39, d2: -0.23, d3: 0.15, d4: 0.29 },
  container:         { d1: -0.39, d2: -0.23, d3: 0.15, d4: 0.29 },
  gas_carrier:       { d1: -0.39, d2: -0.23, d3: 0.15, d4: 0.29 },
  ro_ro_cargo:       { d1: -0.39, d2: -0.23, d3: 0.15, d4: 0.29 },
  ro_ro_vehicle:     { d1: -0.39, d2: -0.23, d3: 0.15, d4: 0.29 },
  lng_carrier:       { d1: -0.39, d2: -0.23, d3: 0.15, d4: 0.29 },
  cruise_passenger:  { d1: -0.39, d2: -0.23, d3: 0.15, d4: 0.29 },
  general_cargo:     { d1: -0.39, d2: -0.23, d3: 0.15, d4: 0.29 },
  refrigerated:      { d1: -0.39, d2: -0.23, d3: 0.15, d4: 0.29 },
};

// Pre-computed boundary multipliers (for performance)
export function getCiiBoundaries(vesselType: string): {
  ab: number; bc: number; cd: number; de: number
} {
  const dd = CII_DD_VECTORS[vesselType] ?? CII_DD_VECTORS.bulker;
  return {
    ab: Math.exp(dd.d1),  // ≈ 0.677
    bc: Math.exp(dd.d2),  // ≈ 0.795
    cd: Math.exp(dd.d3),  // ≈ 1.162
    de: Math.exp(dd.d4),  // ≈ 1.336
  };
}

// ─────────────────────────────────────────────
// CO2 EMISSION FACTORS (tonne CO2 / tonne fuel)
// Source: MARPOL Annex VI regulation 2 + MEPC.364(79)
// ─────────────────────────────────────────────

export const CO2_FACTORS: Record<string, number> = {
  hfo:        3.114,
  lsfo:       3.151,
  mdo:        3.206,
  mgo:        3.206,
  lng:        2.750,
  methanol:   1.375,
  lpg:        3.031,
  biofuel:    0.000,  // Zero-rated for CII purposes (well-to-wake excluded)
  hydrogen:   0.000,
  ammonia:    0.000,
};

// ─────────────────────────────────────────────
// CORRECTION FACTORS (CF)
// Source: MEPC.1/Circ.896/Rev.1
// These reduce the transport work denominator (distance × capacity)
// ─────────────────────────────────────────────

export interface CorrectionFactors {
  ice?: boolean;           // Ice class IA/IA Super/IB/IC — reduces distance by ice factor
  iceClass?: 'IA_Super' | 'IA' | 'IB' | 'IC';
  shuttleTanker?: boolean;      // Shuttle tanker correction
  windPropulsion?: boolean;     // Wind-assisted propulsion
  coldIroning?: boolean;        // Onshore power supply at berth
  cargoHeatingSteam?: boolean;  // Steam heating corrections for tankers
}

// Ice class correction factor applied to capacity (multiply DWT)
const ICE_DWT_REDUCTION: Record<string, number> = {
  IA_Super: 0.15,
  IA:       0.10,
  IB:       0.05,
  IC:       0.02,
};

/**
 * Apply correction factors to effective DWT.
 * Returns adjusted DWT used in attained CII denominator.
 */
export function applyDwtCorrections(
  dwt: number,
  corrections: CorrectionFactors,
): number {
  let adjustedDwt = dwt;

  if (corrections.ice && corrections.iceClass) {
    const reduction = ICE_DWT_REDUCTION[corrections.iceClass] ?? 0;
    adjustedDwt *= (1 - reduction);
  }

  return Math.max(adjustedDwt, dwt * 0.5); // Safety: never reduce below 50%
}

// ─────────────────────────────────────────────
// INPUT / OUTPUT TYPES
// ─────────────────────────────────────────────

export interface FuelConsumption {
  type: keyof typeof CO2_FACTORS;
  metricTonnes: number;
}

export interface CiiInput {
  vesselType: string;
  dwt: number;
  distanceNm: number;
  fuelConsumption: FuelConsumption[];
  year: number;
  corrections?: CorrectionFactors;
}

export interface CiiResult {
  totalCo2G: number;
  attainedCii: number;          // gCO2 / (DWT·nm)
  requiredCii: number;          // from reference line × reduction factor
  ciiRatio: number;             // attained / required
  rating: 'A' | 'B' | 'C' | 'D' | 'E';
  boundaries: { ab: number; bc: number; cd: number; de: number };
  reductionFactor: number;
}

// ─────────────────────────────────────────────
// PURE CALCULATION FUNCTIONS
// ─────────────────────────────────────────────

/**
 * Calculate total CO2 in grams from a list of fuel consumptions.
 */
export function calculateCo2Grams(fuelConsumption: FuelConsumption[]): number {
  return fuelConsumption.reduce((sum, fuel) => {
    const factor = CO2_FACTORS[fuel.type] ?? CO2_FACTORS.hfo;
    return sum + fuel.metricTonnes * factor * 1_000_000; // t → g
  }, 0);
}

/**
 * Calculate IMO required CII for a vessel type + capacity + year.
 *   Required CII = (a × DWT^(-c)) × reduction_factor
 */
export function calculateRequiredCii(
  vesselType: string,
  dwt: number,
  year: number,
): { requiredCii: number; reductionFactor: number } {
  const params = CII_REFERENCE_PARAMS[vesselType] ?? CII_REFERENCE_PARAMS.bulker;
  const reductionFactor = CII_REDUCTION_FACTORS[year] ?? 0.91;

  // a × DWT^(-c)  i.e.  a / (DWT^c)
  const referenceLine = params.c === 0
    ? params.a                          // Gas / LNG: flat line
    : params.a * Math.pow(dwt, -params.c);

  return { requiredCii: referenceLine * reductionFactor, reductionFactor };
}

/**
 * Determine CII rating (A–E) from the ratio attained / required.
 * Uses per-vessel-type dd vectors (MEPC.354(78)).
 */
export function getCiiRating(
  ciiRatio: number,
  vesselType: string,
): 'A' | 'B' | 'C' | 'D' | 'E' {
  const { ab, bc, cd, de } = getCiiBoundaries(vesselType);
  if (ciiRatio < ab) return 'A';
  if (ciiRatio < bc) return 'B';
  if (ciiRatio < cd) return 'C';
  if (ciiRatio < de) return 'D';
  return 'E';
}

/**
 * Full CII calculation pipeline.
 */
export function calculateCii(input: CiiInput): CiiResult {
  const totalCo2G = calculateCo2Grams(input.fuelConsumption);

  const effectiveDwt = input.corrections
    ? applyDwtCorrections(input.dwt, input.corrections)
    : input.dwt;

  if (effectiveDwt <= 0 || input.distanceNm <= 0) {
    return {
      totalCo2G,
      attainedCii: 0,
      requiredCii: 0,
      ciiRatio: 1,
      rating: 'C',
      boundaries: getCiiBoundaries(input.vesselType),
      reductionFactor: CII_REDUCTION_FACTORS[input.year] ?? 0.91,
    };
  }

  const attainedCii = totalCo2G / (effectiveDwt * input.distanceNm);
  const { requiredCii, reductionFactor } = calculateRequiredCii(
    input.vesselType,
    effectiveDwt,
    input.year,
  );
  const ciiRatio = requiredCii > 0 ? attainedCii / requiredCii : 1;
  const rating = getCiiRating(ciiRatio, input.vesselType);
  const boundaries = getCiiBoundaries(input.vesselType);

  return { totalCo2G, attainedCii, requiredCii, ciiRatio, rating, boundaries, reductionFactor };
}

/**
 * Project year-end CII rating from year-to-date data.
 * Useful for mid-year "on track?" analysis.
 */
export function projectYearEndCii(
  ytdCo2G: number,
  ytdDistanceNm: number,
  fullYearDistanceNm: number,
  vesselType: string,
  dwt: number,
  year: number,
): { projectedRating: 'A' | 'B' | 'C' | 'D' | 'E'; projectedCiiRatio: number } {
  if (ytdDistanceNm <= 0) return { projectedRating: 'C', projectedCiiRatio: 1 };

  const co2PerNm = ytdCo2G / ytdDistanceNm;
  const projectedCo2G = co2PerNm * fullYearDistanceNm;
  const attainedCii = projectedCo2G / (dwt * fullYearDistanceNm);
  const { requiredCii } = calculateRequiredCii(vesselType, dwt, year);
  const projectedCiiRatio = requiredCii > 0 ? attainedCii / requiredCii : 1;

  return {
    projectedRating: getCiiRating(projectedCiiRatio, vesselType),
    projectedCiiRatio,
  };
}

/**
 * What-if simulator: given a change in speed or fuel type,
 * estimate the new CII ratio and rating.
 */
export interface WhatIfInput {
  currentCo2G: number;
  currentDistanceNm: number;
  dwt: number;
  vesselType: string;
  year: number;
  // Levers
  speedReductionPct?: number;     // e.g. 0.10 = slow down 10%
  fuelSwitchPct?: number;         // e.g. 0.20 = replace 20% HFO with LNG
  newFuelType?: keyof typeof CO2_FACTORS;
}

export function simulateCii(input: WhatIfInput): {
  newCiiRatio: number;
  newRating: 'A' | 'B' | 'C' | 'D' | 'E';
  co2Reduction: number;
  ratingChange: string;
} {
  let co2G = input.currentCo2G;

  // Speed reduction: fuel consumption ∝ speed^3 (cubic law)
  if (input.speedReductionPct) {
    const speedFactor = Math.pow(1 - input.speedReductionPct, 3);
    co2G *= speedFactor;
  }

  // Fuel switch: replace portion of HFO with cleaner fuel
  if (input.fuelSwitchPct && input.newFuelType) {
    const newFactor = CO2_FACTORS[input.newFuelType] ?? CO2_FACTORS.hfo;
    const hfoFactor = CO2_FACTORS.hfo;
    const reduction = (hfoFactor - newFactor) / hfoFactor * input.fuelSwitchPct;
    co2G *= (1 - reduction);
  }

  const attainedCii = co2G / (input.dwt * input.currentDistanceNm);
  const { requiredCii } = calculateRequiredCii(input.vesselType, input.dwt, input.year);
  const newCiiRatio = requiredCii > 0 ? attainedCii / requiredCii : 1;
  const newRating = getCiiRating(newCiiRatio, input.vesselType);
  const co2Reduction = ((input.currentCo2G - co2G) / input.currentCo2G) * 100;

  const { requiredCii: rCii } = calculateRequiredCii(input.vesselType, input.dwt, input.year);
  const currentRating = getCiiRating(input.currentCo2G / (input.dwt * input.currentDistanceNm) / rCii, input.vesselType);
  const ratingChange = currentRating === newRating
    ? 'No change'
    : `${currentRating} → ${newRating}`;

  return { newCiiRatio, newRating, co2Reduction, ratingChange };
}

/**
 * Calculate the maximum annual CO2 budget (grams) to maintain a target CII rating.
 * Useful for voyage planning.
 */
export function calculateCo2Budget(
  vesselType: string,
  dwt: number,
  year: number,
  distanceNm: number,
  targetRating: 'A' | 'B' | 'C' | 'D',
): number {
  const { requiredCii } = calculateRequiredCii(vesselType, dwt, year);
  const { ab, bc, cd, de } = getCiiBoundaries(vesselType);

  // Use upper boundary for target rating
  const maxRatio = targetRating === 'A' ? ab * 0.99
    : targetRating === 'B' ? bc * 0.99
    : targetRating === 'C' ? cd * 0.99
    : de * 0.99;

  const maxAttainedCii = requiredCii * maxRatio;
  return maxAttainedCii * dwt * distanceNm; // grams
}
