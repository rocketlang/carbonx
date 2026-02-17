/**
 * EEXI DB Service
 * Orchestrates calculation + persistence of EexiRecord
 */

import { prisma } from '../../lib/prisma.js';
import {
  calculateEexiCompliance,
  calculateRequiredEexi,
  getEexiCapacity,
  type EexiInput,
} from './eexi-calculator.js';
import { logger } from '../../utils/logger.js';

// ─────────────────────────────────────────────
// Calculate + persist for a single vessel
// EEXI is one-time: only recalculate if explicitly requested
// ─────────────────────────────────────────────

export async function calculateAndPersist(
  vesselId: string,
  eexiInput: Omit<EexiInput, 'vesselType' | 'dwt' | 'gt'>,
  certInfo?: {
    certificateNumber?: string;
    certifiedBy?: string;
    certifiedAt?: Date;
    enginePowerLimitKw?: number;
  },
): Promise<{
  id: string;
  attainedEexi: number;
  requiredEexi: number;
  isCompliant: boolean;
  eplFraction: number;
  speedPenaltyPct: number;
}> {
  const vessel = await prisma.vessel.findUniqueOrThrow({
    where: { id: vesselId },
    select: { type: true, dwt: true, gt: true, enginePowerKw: true },
  });

  const fullInput: EexiInput = {
    vesselType: vessel.type,
    dwt: vessel.dwt,
    gt: vessel.gt,
    mcrKw: eexiInput.mcrKw ?? vessel.enginePowerKw ?? 10_000,
    designSpeedKn: eexiInput.designSpeedKn,
    fuelType: eexiInput.fuelType,
    sfcGkWh: eexiInput.sfcGkWh,
    fwFactor: eexiInput.fwFactor,
    eplFraction: eexiInput.eplFraction,
  };

  const result = calculateEexiCompliance(fullInput);

  const capacity = getEexiCapacity({ type: vessel.type, dwt: vessel.dwt, gt: vessel.gt });
  const requiredEexi = calculateRequiredEexi(vessel.type, capacity);

  const record = await prisma.eexiRecord.upsert({
    where: { vesselId },
    update: {
      attainedEexi:       result.attainedEexi,
      requiredEexi:       result.requiredEexi,
      isCompliant:        result.isCompliant,
      enginePowerLimitKw: certInfo?.enginePowerLimitKw ?? (
        result.isCompliant ? null : result.eplFraction * fullInput.mcrKw
      ),
      shaPowerLimitKw:   result.isCompliant ? null : result.eplFraction * 0.75 * fullInput.mcrKw,
      certificateNumber:  certInfo?.certificateNumber,
      certifiedBy:        certInfo?.certifiedBy,
      certifiedAt:        certInfo?.certifiedAt,
    },
    create: {
      vesselId,
      attainedEexi:       result.attainedEexi,
      requiredEexi:       result.requiredEexi,
      isCompliant:        result.isCompliant,
      enginePowerLimitKw: certInfo?.enginePowerLimitKw ?? (
        result.isCompliant ? null : result.eplFraction * fullInput.mcrKw
      ),
      shaPowerLimitKw:   result.isCompliant ? null : result.eplFraction * 0.75 * fullInput.mcrKw,
      certificateNumber:  certInfo?.certificateNumber,
      certifiedBy:        certInfo?.certifiedBy,
      certifiedAt:        certInfo?.certifiedAt,
    },
  });

  logger.info(
    {
      vesselId,
      attainedEexi: result.attainedEexi.toFixed(3),
      requiredEexi: result.requiredEexi.toFixed(3),
      isCompliant: result.isCompliant,
      eplFraction: result.eplFraction.toFixed(3),
    },
    `EEXI: vessel ${vesselId} — ${result.isCompliant ? 'COMPLIANT' : `NON-COMPLIANT (EPL ${(result.eplFraction * 100).toFixed(0)}%)`}`,
  );

  return {
    id: record.id,
    attainedEexi: result.attainedEexi,
    requiredEexi: result.requiredEexi,
    isCompliant: result.isCompliant,
    eplFraction: result.eplFraction,
    speedPenaltyPct: result.speedPenaltyPct,
  };
}

// ─────────────────────────────────────────────
// Get fleet EEXI status
// ─────────────────────────────────────────────

export async function getFleetEexiStatus(organizationId: string) {
  const vessels = await prisma.vessel.findMany({
    where: { organizationId },
    include: { eexiRecord: true },
  });

  const records = vessels.map((v) => ({
    vessel: { id: v.id, name: v.name, imo: v.imo, type: v.type, dwt: v.dwt, gt: v.gt },
    eexiRecord: v.eexiRecord,
  }));

  const certified = records.filter((r) => r.eexiRecord?.attainedEexi != null);
  const compliant = certified.filter((r) => r.eexiRecord?.isCompliant);
  const nonCompliant = certified.filter((r) => !r.eexiRecord?.isCompliant);
  const pending = records.filter((r) => !r.eexiRecord);

  return {
    totalVessels: records.length,
    certifiedVessels: certified.length,
    compliantVessels: compliant.length,
    nonCompliantVessels: nonCompliant.length,
    pendingCertification: pending.length,
    vessels: records,
  };
}

// ─────────────────────────────────────────────
// Update certification details only (no recalculation)
// ─────────────────────────────────────────────

export async function updateCertification(
  vesselId: string,
  certInfo: {
    certificateNumber?: string;
    certifiedBy?: string;
    certifiedAt?: Date;
  },
) {
  return prisma.eexiRecord.update({
    where: { vesselId },
    data: certInfo,
  });
}
