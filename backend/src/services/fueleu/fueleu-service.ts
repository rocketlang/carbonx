/**
 * FuelEU Maritime DB Service
 * Orchestrates calculation + persistence of FuelEuRecord
 */

import { prisma } from '../../lib/prisma.js';
import {
  calculateFuelEuCompliance,
  voyageToConsumption,
  getTargetGhgIntensity,
  FUELEU_BASELINE_GGHG,
  type FuelConsumption,
} from './fueleu-calculator.js';
import { logger } from '../../utils/logger.js';

// ─────────────────────────────────────────────
// Calculate + persist for a single vessel/year
// ─────────────────────────────────────────────

export async function calculateAndPersist(
  vesselId: string,
  year: number,
  organizationId: string,
): Promise<{
  id: string;
  actualGhgIntensity: number;
  targetGhgIntensity: number;
  ghgGap: number;
  isCompliant: boolean;
  penaltyEur: number;
  totalEnergyMj: number;
  poolSurplusMj: number;
  poolBorrowedMj: number;
}> {
  // Aggregate fuel consumption from completed voyages in the year
  const voyages = await prisma.voyage.findMany({
    where: {
      vesselId,
      status: 'completed',
      departureAt: {
        gte: new Date(`${year}-01-01`),
        lt:  new Date(`${year + 1}-01-01`),
      },
    },
  });

  // Sum fuel masses across all voyages
  const totalConsumption: FuelConsumption = {
    hfoMt:       voyages.reduce((s, v) => s + v.hfoConsumedMt, 0),
    mgoMt:       voyages.reduce((s, v) => s + v.mgoConsumedMt, 0),
    lngMt:       voyages.reduce((s, v) => s + v.lngConsumedMt, 0),
    methanolMt:  voyages.reduce((s, v) => s + v.methanolConsumedMt, 0),
    biofuelMt:   voyages.reduce((s, v) => s + v.biofuelConsumedMt, 0),
  };

  const result = calculateFuelEuCompliance(year, totalConsumption);

  // Pool surplus is positive when over-compliant; poolBorrowed when needing external supply
  const poolSurplusMj = result.poolBalanceMj > 0 ? result.poolBalanceMj : 0;
  const poolBorrowedMj = result.poolBalanceMj < 0 ? Math.abs(result.poolBalanceMj) : 0;

  const record = await prisma.fuelEuRecord.upsert({
    where: { vesselId_year: { vesselId, year } },
    update: {
      actualGhgIntensity: result.actualGhgIntensity,
      targetGhgIntensity: result.targetGhgIntensity,
      ghgGap:             result.ghgGap,
      totalEnergyMj:      result.totalEnergyMj,
      isCompliant:        result.isCompliant,
      penaltyEur:         result.penaltyEur,
      poolSurplusMj,
      poolBorrowedMj,
    },
    create: {
      vesselId,
      year,
      actualGhgIntensity: result.actualGhgIntensity,
      targetGhgIntensity: result.targetGhgIntensity,
      ghgGap:             result.ghgGap,
      totalEnergyMj:      result.totalEnergyMj,
      isCompliant:        result.isCompliant,
      penaltyEur:         result.penaltyEur,
      poolSurplusMj,
      poolBorrowedMj,
    },
  });

  logger.info(
    {
      vesselId,
      year,
      actualGhgIntensity: result.actualGhgIntensity.toFixed(2),
      targetGhgIntensity: result.targetGhgIntensity.toFixed(2),
      isCompliant: result.isCompliant,
      penaltyEur: result.penaltyEur.toFixed(0),
    },
    `FuelEU: vessel ${vesselId} — ${result.isCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'} (${year})`,
  );

  return {
    id: record.id,
    actualGhgIntensity: result.actualGhgIntensity,
    targetGhgIntensity: result.targetGhgIntensity,
    ghgGap:             result.ghgGap,
    isCompliant:        result.isCompliant,
    penaltyEur:         result.penaltyEur,
    totalEnergyMj:      result.totalEnergyMj,
    poolSurplusMj,
    poolBorrowedMj,
  };
}

// ─────────────────────────────────────────────
// Batch: calculate all vessels for an org
// ─────────────────────────────────────────────

export async function calculateFleetFuelEu(
  organizationId: string,
  year: number,
): Promise<{ processed: number; compliant: number; totalPenaltyEur: number }> {
  const vessels = await prisma.vessel.findMany({
    where: { organizationId },
    select: { id: true },
  });

  let compliant = 0;
  let totalPenaltyEur = 0;

  for (const v of vessels) {
    const r = await calculateAndPersist(v.id, year, organizationId);
    if (r.isCompliant) compliant++;
    totalPenaltyEur += r.penaltyEur;
  }

  logger.info(
    { organizationId, year, processed: vessels.length, compliant, totalPenaltyEur },
    'FuelEU fleet calculation complete',
  );

  return { processed: vessels.length, compliant, totalPenaltyEur };
}

// ─────────────────────────────────────────────
// Fleet dashboard aggregation
// ─────────────────────────────────────────────

export async function getFleetFuelEuDashboard(
  organizationId: string,
  year: number,
) {
  const records = await prisma.fuelEuRecord.findMany({
    where: {
      vessel: { organizationId },
      year,
    },
    include: { vessel: { select: { name: true, imo: true, type: true } } },
  });

  const totalVessels = records.length;
  const compliantVessels = records.filter((r) => r.isCompliant).length;
  const totalEnergyMj = records.reduce((s, r) => s + r.totalEnergyMj, 0);
  const totalPenaltyEur = records.reduce((s, r) => s + r.penaltyEur, 0);
  const totalPoolSurplusMj = records.reduce((s, r) => s + r.poolSurplusMj, 0);
  const totalPoolBorrowedMj = records.reduce((s, r) => s + r.poolBorrowedMj, 0);

  // Weighted average GHG intensity across fleet
  const weightedGhg =
    totalEnergyMj > 0
      ? records.reduce(
          (s, r) => s + (r.actualGhgIntensity ?? FUELEU_BASELINE_GGHG) * r.totalEnergyMj,
          0,
        ) / totalEnergyMj
      : FUELEU_BASELINE_GGHG;

  const targetGhgIntensity = getTargetGhgIntensity(year);

  return {
    year,
    totalVessels,
    compliantVessels,
    nonCompliantVessels: totalVessels - compliantVessels,
    fleetAvgGhgIntensity: weightedGhg,
    targetGhgIntensity,
    fleetGhgGap: weightedGhg - targetGhgIntensity,
    totalEnergyMj,
    totalPenaltyEur,
    totalPoolSurplusMj,
    totalPoolBorrowedMj,
    records,
  };
}

// ─────────────────────────────────────────────
// Record pooling transaction (borrow/lend MJ)
// ─────────────────────────────────────────────

export async function recordPooling(
  vesselId: string,
  year: number,
  poolMj: number,       // positive = surplus lent, negative = deficit borrowed
) {
  const record = await prisma.fuelEuRecord.findUnique({
    where: { vesselId_year: { vesselId, year } },
  });
  if (!record) throw new Error(`No FuelEU record for vessel ${vesselId} year ${year}`);

  if (poolMj > 0) {
    await prisma.fuelEuRecord.update({
      where: { id: record.id },
      data: { poolSurplusMj: record.poolSurplusMj - poolMj },
    });
  } else {
    await prisma.fuelEuRecord.update({
      where: { id: record.id },
      data: { poolBorrowedMj: record.poolBorrowedMj + Math.abs(poolMj) },
    });
  }

  logger.info({ vesselId, year, poolMj }, 'FuelEU pool transaction recorded');
}
