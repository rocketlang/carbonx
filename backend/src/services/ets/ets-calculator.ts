/**
 * EU ETS Calculator — Pure Functions
 * EU ETS Directive 2003/87/EC (shipping from Jan 2024)
 *
 * Phase-in: 40% (2024) → 70% (2025) → 100% (2026+)
 * Scope rules: EU-EU = 100%, EU-non-EU = 50%, non-EU = 0%
 */

// Phase-in percentages by year
export const ETS_PHASE_IN: Record<number, number> = {
  2024: 0.40,
  2025: 0.70,
  2026: 1.00,
};

export type EtsScope = 'eu_eu' | 'eu_non_eu' | 'non_eu_eu' | 'non_eu' | 'none';

// Fraction of CO2 subject to ETS by voyage scope
export const ETS_SCOPE_FRACTION: Record<EtsScope, number> = {
  eu_eu:      1.00,
  eu_non_eu:  0.50,
  non_eu_eu:  0.50,
  non_eu:     0.00,
  none:       0.00,
};

export interface EtsVoyageInput {
  co2Mt: number;
  scope: EtsScope;
  year: number;
}

export interface EtsVoyageResult {
  co2ApplicableMt: number;   // CO2 subject to ETS (after scope + phase-in)
  obligationMt: number;      // EUAs required
  estimatedCostEur: number;  // at current carbon price
}

/**
 * Calculate ETS obligation for a single voyage.
 */
export function calculateEtsObligation(
  voyage: EtsVoyageInput,
  euaPriceEur: number,
): EtsVoyageResult {
  const phaseIn = ETS_PHASE_IN[voyage.year] ?? 1.00;
  const scopeFraction = ETS_SCOPE_FRACTION[voyage.scope] ?? 0;

  const co2ApplicableMt = voyage.co2Mt * scopeFraction * phaseIn;
  const obligationMt = co2ApplicableMt;
  const estimatedCostEur = obligationMt * euaPriceEur;

  return { co2ApplicableMt, obligationMt, estimatedCostEur };
}

/**
 * Aggregate ETS obligations for a fleet.
 */
export function aggregateEtsObligation(
  voyages: EtsVoyageInput[],
  euaPriceEur: number,
): { totalObligationMt: number; totalCostEur: number } {
  let totalObligationMt = 0;
  let totalCostEur = 0;

  for (const voyage of voyages) {
    const result = calculateEtsObligation(voyage, euaPriceEur);
    totalObligationMt += result.obligationMt;
    totalCostEur += result.estimatedCostEur;
  }

  return { totalObligationMt, totalCostEur };
}
