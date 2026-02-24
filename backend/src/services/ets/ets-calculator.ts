/**
 * EU ETS Pure Calculation Functions
 * EU ETS Directive 2003/87/EC — shipping from 1 Jan 2024
 * Commission Implementing Regulation (EU) 2023/2776
 *
 * All functions are pure (no side effects, no DB).
 */

// ─────────────────────────────────────────────
// EU/EEA MEMBER STATES (ISO-3166-1 alpha-2)
// Vessels on voyages to/from these countries are in ETS scope
// ─────────────────────────────────────────────

export const EU_EEA_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IS', 'IE', 'IT', 'LV', 'LI', 'LT', 'LU',
  'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
]);

// ─────────────────────────────────────────────
// PHASE-IN SCHEDULE (% of verified CO2 to surrender)
// Source: Article 3ge of the EU ETS Directive
// ─────────────────────────────────────────────

export const ETS_PHASE_IN: Record<number, number> = {
  2024: 0.40,   // 40% of applicable CO2
  2025: 0.70,   // 70%
  2026: 1.00,   // 100% — fully live
};

function getPhaseIn(year: number): number {
  if (year <= 2023) return 0;
  if (year >= 2026) return 1.00;
  return ETS_PHASE_IN[year] ?? 1.00;
}

// ─────────────────────────────────────────────
// ETS SCOPE RULES
// Source: Article 3b(f) — based on port of call
// EU-EU  voyage:     100% of CO2
// EU-non-EU voyage:   50% of CO2 (both inbound and outbound)
// Non-EU voyage:       0% of CO2
// At-berth (EU port):100% of CO2
// ─────────────────────────────────────────────

export type EtsScope = 'eu_eu' | 'eu_non_eu' | 'non_eu_eu' | 'non_eu' | 'none';

export const ETS_SCOPE_FRACTION: Record<EtsScope, number> = {
  eu_eu:      1.00,
  eu_non_eu:  0.50,
  non_eu_eu:  0.50,
  non_eu:     0.00,
  none:       0.00,
};

/**
 * Classify an ETS voyage scope from departure / arrival country codes.
 */
export function classifyEtsScope(
  departureCc: string,
  arrivalCc: string,
): EtsScope {
  const depEu = EU_EEA_COUNTRIES.has(departureCc.toUpperCase());
  const arrEu = EU_EEA_COUNTRIES.has(arrivalCc.toUpperCase());

  if (depEu && arrEu)   return 'eu_eu';
  if (depEu && !arrEu)  return 'eu_non_eu';
  if (!depEu && arrEu)  return 'non_eu_eu';
  return 'non_eu';
}

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface EtsVoyageInput {
  co2Mt: number;         // Total CO2 in metric tonnes
  scope: EtsScope;
  year: number;
}

export interface EtsVoyageResult {
  co2ApplicableMt: number;     // CO2 after scope fraction
  obligationMt: number;        // CO2 after scope × phase-in
  phaseInPct: number;          // e.g. 0.70 for 2025
  scopeFraction: number;       // e.g. 0.50 for EU-non-EU
  estimatedCostEur: number;    // at current carbon price
}

export interface FleetEtsObligation {
  totalCo2Mt: number;
  totalApplicableMt: number;
  totalObligationMt: number;
  totalEstimatedCostEur: number;
  surrenderDeadline: Date;
  year: number;
}

// ─────────────────────────────────────────────
// PURE FUNCTIONS
// ─────────────────────────────────────────────

/**
 * Calculate ETS obligation for a single voyage.
 */
export function calculateEtsObligation(
  voyage: EtsVoyageInput,
  euaPriceEur: number,
): EtsVoyageResult {
  const phaseInPct = getPhaseIn(voyage.year);
  const scopeFraction = ETS_SCOPE_FRACTION[voyage.scope] ?? 0;

  const co2ApplicableMt = voyage.co2Mt * scopeFraction;
  const obligationMt = co2ApplicableMt * phaseInPct;
  const estimatedCostEur = obligationMt * euaPriceEur;

  return { co2ApplicableMt, obligationMt, phaseInPct, scopeFraction, estimatedCostEur };
}

/**
 * Aggregate ETS obligations for a list of voyages.
 */
export function aggregateEtsObligation(
  voyages: EtsVoyageInput[],
  euaPriceEur: number,
): { totalObligationMt: number; totalCostEur: number; totalApplicableMt: number } {
  let totalApplicableMt = 0;
  let totalObligationMt = 0;
  let totalCostEur = 0;

  for (const voyage of voyages) {
    const r = calculateEtsObligation(voyage, euaPriceEur);
    totalApplicableMt += r.co2ApplicableMt;
    totalObligationMt += r.obligationMt;
    totalCostEur += r.estimatedCostEur;
  }

  return { totalObligationMt, totalCostEur, totalApplicableMt };
}

/**
 * Surrender deadline for a given year (30 April of the following year).
 */
export function getSurrenderDeadline(year: number): Date {
  return new Date(`${year + 1}-04-30T23:59:59Z`);
}

/**
 * Days remaining until the surrender deadline.
 * Negative means already past.
 */
export function daysUntilSurrender(year: number): number {
  const deadline = getSurrenderDeadline(year);
  const now = new Date();
  return Math.ceil((deadline.getTime() - now.getTime()) / 86_400_000);
}

// ─────────────────────────────────────────────
// PENALTY CALCULATION
// Art. 16 EU ETS Directive — €100/tonne for each uncovered EUA
// Penalty does NOT extinguish the obligation (must still surrender)
// ─────────────────────────────────────────────

export const ETS_PENALTY_PER_TONNE_EUR = 100;

export interface EtsComplianceResult {
  status:          'compliant' | 'non_compliant' | 'pending';
  shortfallMt:     number;
  penaltyEur:      number;
  surplusMt:       number;   // EUAs available to bank to next year
  settledPct:      number;
}

/**
 * Calculate compliance status and penalty for an ETS record.
 * @param obligationMt   - Total EUAs required (post phase-in)
 * @param euaSurrendered - EUAs already surrendered
 * @param deadlinePassed - Whether 30 April deadline has passed
 */
export function calculateEtsCompliance(
  obligationMt: number,
  euaSurrendered: number,
  deadlinePassed: boolean,
): EtsComplianceResult {
  const shortfallMt = Math.max(0, obligationMt - euaSurrendered);
  const surplusMt   = Math.max(0, euaSurrendered - obligationMt);
  const settledPct  = obligationMt > 0
    ? Math.min(100, (euaSurrendered / obligationMt) * 100)
    : 100;

  let status: EtsComplianceResult['status'];
  if (shortfallMt === 0) {
    status = 'compliant';
  } else if (deadlinePassed) {
    status = 'non_compliant';
  } else {
    status = 'pending';
  }

  const penaltyEur = status === 'non_compliant'
    ? shortfallMt * ETS_PENALTY_PER_TONNE_EUR
    : 0;

  return { status, shortfallMt, penaltyEur, surplusMt, settledPct };
}

// ─────────────────────────────────────────────
// ALLOWANCE BANKING
// Art. 13 — unused EUAs can be banked to future years (no expiry)
// ─────────────────────────────────────────────

/**
 * Calculate how many EUAs can be banked to next year.
 * surplus = max(0, surrendered − obligation)
 * These can be carried forward; they don't expire.
 */
export function calculateBankableAllowances(
  obligationMt: number,
  euaSurrendered: number,
): number {
  return Math.max(0, euaSurrendered - obligationMt);
}

/**
 * Effective obligation after applying banked allowances from prior year.
 */
export function applyBankedAllowances(
  obligationMt: number,
  bankedMt: number,
): { netObligationMt: number; bankedUsed: number; bankedRemaining: number } {
  const bankedUsed      = Math.min(bankedMt, obligationMt);
  const netObligationMt = Math.max(0, obligationMt - bankedUsed);
  const bankedRemaining = bankedMt - bankedUsed;
  return { netObligationMt, bankedUsed, bankedRemaining };
}

/**
 * ETS cost forecast for the remainder of the year,
 * based on YTD pace and current carbon price.
 */
export function forecastFullYearEtsCost(
  ytdObligationMt: number,
  dayOfYear: number,
  euaPriceEur: number,
): { projectedObligationMt: number; projectedCostEur: number } {
  if (dayOfYear <= 0) return { projectedObligationMt: 0, projectedCostEur: 0 };
  const dailyRate = ytdObligationMt / dayOfYear;
  const projectedObligationMt = dailyRate * 365;
  return { projectedObligationMt, projectedCostEur: projectedObligationMt * euaPriceEur };
}
