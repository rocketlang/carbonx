/**
 * CII Pure Calculation Functions
 * IMO MARPOL Annex VI — Resolution MEPC.337(76)
 *
 * All functions are pure (no side effects, no DB access).
 * Suitable for unit testing and "what-if" simulations.
 */

// ─────────────────────────────────────────────
// CONSTANTS (IMO Reference Line Parameters)
// Source: MEPC.339(76) Table 1
// ─────────────────────────────────────────────

export const CII_REFERENCE_PARAMS: Record<string, { a: number; c: number }> = {
  bulker:          { a: 4745,  c: 0.622 },
  tanker:          { a: 5247,  c: 0.610 },
  container:       { a: 1984,  c: 0.489 },
  gas_carrier:     { a: 144.0, c: 0.0   },
  ro_ro_cargo:     { a: 5739,  c: 0.631 },
  ro_ro_vehicle:   { a: 5739,  c: 0.631 },
  lng_carrier:     { a: 9827,  c: 0.0   },
  cruise_passenger:{ a: 930.0, c: 0.0   },
  general_cargo:   { a: 31948, c: 0.792 },
  refrigerated:    { a: 4600,  c: 0.557 },
};

// Annual CII reduction factors vs 2019 baseline (MEPC.338(76))
export const CII_REDUCTION_FACTORS: Record<number, number> = {
  2023: 0.95,
  2024: 0.93,
  2025: 0.91,
  2026: 0.89,
  2027: 0.00, // TBD by IMO
  2028: 0.00,
  2029: 0.00,
  2030: 0.00,
};

// Rating boundary factors (dd vectors) by vessel type
// Simplified: using generic MEPC boundaries
const RATING_BOUNDARIES = {
  AB: 0.86,
  BC: 0.94,
  CD: 1.06,
  DE: 1.18,
};

// CO2 emission factors per fuel type (tonne CO2 / tonne fuel)
export const CO2_FACTORS: Record<string, number> = {
  hfo:      3.114,
  lsfo:     3.114,
  mdo:      3.206,
  mgo:      3.206,
  lng:      2.750,
  methanol: 1.375,
  lpg:      3.000,
};

// ─────────────────────────────────────────────
// TYPES
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
  iceCorrection?: boolean;
  shuttleCorrection?: boolean;
}

export interface CiiResult {
  totalCo2G: number;           // total CO2 in grams
  attainedCii: number;         // g CO2 / (DWT·nm)
  requiredCii: number;         // from reference line
  ciiRatio: number;            // attained / required
  rating: 'A' | 'B' | 'C' | 'D' | 'E';
}

// ─────────────────────────────────────────────
// PURE FUNCTIONS
// ─────────────────────────────────────────────

/**
 * Calculate total CO2 emissions in grams from fuel consumption.
 */
export function calculateCo2Grams(fuelConsumption: FuelConsumption[]): number {
  return fuelConsumption.reduce((sum, fuel) => {
    const factor = CO2_FACTORS[fuel.type] ?? CO2_FACTORS.hfo;
    return sum + fuel.metricTonnes * factor * 1_000_000; // tonnes → grams
  }, 0);
}

/**
 * Calculate the IMO required CII for a vessel type, capacity, and year.
 * Required CII = (a × DWT^c) × reduction_factor
 */
export function calculateRequiredCii(
  vesselType: string,
  dwt: number,
  year: number,
): number {
  const params = CII_REFERENCE_PARAMS[vesselType] ?? CII_REFERENCE_PARAMS.bulker;
  const reductionFactor = CII_REDUCTION_FACTORS[year] ?? 0.91; // default to 2025

  // Reference CII from reference line
  const referenceCii = params.a * Math.pow(dwt, -params.c);

  return referenceCii * reductionFactor;
}

/**
 * Determine CII rating (A–E) from the ratio of attained / required.
 */
export function getCiiRating(ciiRatio: number): 'A' | 'B' | 'C' | 'D' | 'E' {
  if (ciiRatio < RATING_BOUNDARIES.AB) return 'A';
  if (ciiRatio < RATING_BOUNDARIES.BC) return 'B';
  if (ciiRatio < RATING_BOUNDARIES.CD) return 'C';
  if (ciiRatio < RATING_BOUNDARIES.DE) return 'D';
  return 'E';
}

/**
 * Full CII calculation pipeline.
 */
export function calculateCii(input: CiiInput): CiiResult {
  const totalCo2G = calculateCo2Grams(input.fuelConsumption);

  // Apply correction factors (simplified — deduct corrected distance)
  let effectiveDistance = input.distanceNm;
  if (input.iceCorrection) {
    effectiveDistance *= 0.97; // approx 3% correction for ice operations
  }

  const attainedCii = totalCo2G / (input.dwt * effectiveDistance);
  const requiredCii = calculateRequiredCii(input.vesselType, input.dwt, input.year);
  const ciiRatio = attainedCii / requiredCii;
  const rating = getCiiRating(ciiRatio);

  return {
    totalCo2G,
    attainedCii,
    requiredCii,
    ciiRatio,
    rating,
  };
}

/**
 * Project end-of-year CII rating based on current year-to-date data.
 */
export function projectYearEndCii(
  ytdCo2G: number,
  ytdDistanceNm: number,
  fullYearDistanceNm: number,
  input: Omit<CiiInput, 'fuelConsumption' | 'distanceNm'>,
): 'A' | 'B' | 'C' | 'D' | 'E' {
  if (ytdDistanceNm === 0) return 'C';

  // Extrapolate CO2 linearly
  const projectedCo2G = (ytdCo2G / ytdDistanceNm) * fullYearDistanceNm;
  const attainedCii = projectedCo2G / (input.dwt * fullYearDistanceNm);
  const requiredCii = calculateRequiredCii(input.vesselType, input.dwt, input.year);
  return getCiiRating(attainedCii / requiredCii);
}
