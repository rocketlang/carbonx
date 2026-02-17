/**
 * Regulatory Report Generator
 * Aggregates data from all CarbonX modules into structured report payloads.
 *
 * Reports:
 *  - EU MRV Annual Emissions Report (Reg. (EU) 2015/757 + 2023/1805)
 *  - IMO DCS Annual Fuel Oil Consumption Report (MARPOL Annex VI Reg. 22A)
 *  - CII Statement of Compliance (MEPC.337(76) / MEPC.354(78))
 *  - FuelEU Annual Compliance Report (Reg. (EU) 2023/1805 Art. 8)
 *  - EEXI Technical File Summary (MEPC.333(76) Reg. 27)
 *  - Fleet Carbon Executive Summary (internal)
 */

import { prisma } from '../../lib/prisma.js';
import { CO2_FACTORS } from '../cii/cii-calculator.js';

// ─────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────

async function getVesselsForOrg(organizationId: string) {
  return prisma.vessel.findMany({
    where: { organizationId },
    orderBy: { name: 'asc' },
  });
}

async function getVoyagesForYear(vesselId: string, year: number) {
  return prisma.voyage.findMany({
    where: {
      vesselId,
      status: 'completed',
      departureAt: {
        gte: new Date(`${year}-01-01`),
        lt:  new Date(`${year + 1}-01-01`),
      },
    },
    orderBy: { departureAt: 'asc' },
  });
}

function totalFuelMt(voyages: Awaited<ReturnType<typeof getVoyagesForYear>>) {
  return {
    hfo:      voyages.reduce((s, v) => s + v.hfoConsumedMt, 0),
    mgo:      voyages.reduce((s, v) => s + v.mgoConsumedMt, 0),
    lng:      voyages.reduce((s, v) => s + v.lngConsumedMt, 0),
    methanol: voyages.reduce((s, v) => s + v.methanolConsumedMt, 0),
    biofuel:  voyages.reduce((s, v) => s + v.biofuelConsumedMt, 0),
  };
}

function totalCo2Mt(fuel: ReturnType<typeof totalFuelMt>) {
  return (
    fuel.hfo      * CO2_FACTORS.hfo      +
    fuel.mgo      * CO2_FACTORS.mgo      +
    fuel.lng      * CO2_FACTORS.lng      +
    fuel.methanol * CO2_FACTORS.methanol +
    fuel.biofuel  * CO2_FACTORS.biofuel
  );
}

// ─────────────────────────────────────────────
// EU MRV ANNUAL EMISSIONS REPORT
// Regulation (EU) 2015/757, as amended by 2023/1805
// Scope: vessels ≥5,000 GT, EU port calls
// Monitoring method: Method D (bunker delivery notes, default)
// Submission: by 30 April each year to administering state
// ─────────────────────────────────────────────

export async function generateMrvReport(organizationId: string, year: number) {
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
  const vessels = await getVesselsForOrg(organizationId);

  const vesselReports = await Promise.all(
    vessels.map(async (v) => {
      const voyages = await getVoyagesForYear(v.id, year);
      const fuel = totalFuelMt(voyages);
      const co2Mt = totalCo2Mt(fuel);
      const distanceNm = voyages.reduce((s, voy) => s + voy.distanceNm, 0);

      // Time at sea: difference between departure and arrival in hours
      const hoursAtSea = voyages.reduce((s, voy) => {
        if (!voy.arrivalAt) return s;
        return s + (voy.arrivalAt.getTime() - voy.departureAt.getTime()) / 3_600_000;
      }, 0);

      // EU port calls (voyages with EU departure or arrival)
      const euVoyages = voyages.filter(
        (voy) => voy.etsScope === 'eu_eu' || voy.etsScope === 'eu_non_eu' || voy.etsScope === 'non_eu_eu',
      );
      const euCo2Mt = euVoyages.reduce((s, voy) => s + voy.co2EmissionsMt, 0);

      const ciiRecord = await prisma.ciiRecord.findUnique({
        where: { vesselId_year: { vesselId: v.id, year } },
      });

      return {
        vessel: {
          name: v.name,
          imo: v.imo,
          type: v.type,
          flag: v.flag,
          gt: v.gt,
          dwt: v.dwt,
        },
        voyageCount: voyages.length,
        distanceNm,
        hoursAtSea: Math.round(hoursAtSea),
        totalCo2Mt: Math.round(co2Mt * 100) / 100,
        euCo2Mt: Math.round(euCo2Mt * 100) / 100,
        fuelConsumption: {
          hfoMt:      Math.round(fuel.hfo * 100) / 100,
          mgoMt:      Math.round(fuel.mgo * 100) / 100,
          lngMt:      Math.round(fuel.lng * 100) / 100,
          methanolMt: Math.round(fuel.methanol * 100) / 100,
          biofuelMt:  Math.round(fuel.biofuel * 100) / 100,
        },
        ciiRating: ciiRecord?.rating ?? null,
        transportWork: distanceNm > 0 ? co2Mt / (distanceNm * v.dwt / 1_000_000) : 0,
        monitoringMethod: 'Method D — Bunker Delivery Notes (BDN)',
      };
    }),
  );

  const totals = {
    totalCo2Mt: vesselReports.reduce((s, r) => s + r.totalCo2Mt, 0),
    euCo2Mt:    vesselReports.reduce((s, r) => s + r.euCo2Mt, 0),
    distanceNm: vesselReports.reduce((s, r) => s + r.distanceNm, 0),
    hoursAtSea: vesselReports.reduce((s, r) => s + r.hoursAtSea, 0),
    fuelConsumption: {
      hfoMt:      vesselReports.reduce((s, r) => s + r.fuelConsumption.hfoMt, 0),
      mgoMt:      vesselReports.reduce((s, r) => s + r.fuelConsumption.mgoMt, 0),
      lngMt:      vesselReports.reduce((s, r) => s + r.fuelConsumption.lngMt, 0),
      methanolMt: vesselReports.reduce((s, r) => s + r.fuelConsumption.methanolMt, 0),
      biofuelMt:  vesselReports.reduce((s, r) => s + r.fuelConsumption.biofuelMt, 0),
    },
  };

  return {
    reportType: 'EU_MRV',
    regulationRef: 'Regulation (EU) 2015/757 as amended by (EU) 2023/1805',
    submissionDeadline: `${year + 1}-04-30`,
    generatedAt: new Date().toISOString(),
    reportingYear: year,
    companyName: org.name,
    organizationId,
    vesselCount: vessels.length,
    vessels: vesselReports,
    totals,
  };
}

// ─────────────────────────────────────────────
// IMO DCS — DATA COLLECTION SYSTEM
// MARPOL Annex VI Regulation 22A
// Annual fuel oil consumption data reported to flag state / IMO
// ─────────────────────────────────────────────

export async function generateDcsReport(organizationId: string, year: number) {
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
  const vessels = await getVesselsForOrg(organizationId);

  const vesselData = await Promise.all(
    vessels.map(async (v) => {
      const voyages = await getVoyagesForYear(v.id, year);
      const fuel = totalFuelMt(voyages);
      const totalFuel = Object.values(fuel).reduce((s, f) => s + f, 0);
      const distanceNm = voyages.reduce((s, voy) => s + voy.distanceNm, 0);
      const hoursAtSea = voyages.reduce((s, voy) => {
        if (!voy.arrivalAt) return s;
        return s + (voy.arrivalAt.getTime() - voy.departureAt.getTime()) / 3_600_000;
      }, 0);

      return {
        imo: v.imo,
        name: v.name,
        type: v.type,
        flag: v.flag,
        dwt: v.dwt,
        gt: v.gt,
        fuelOilConsumptionMt: {
          hfo:      fuel.hfo,
          mgo:      fuel.mgo,
          lng:      fuel.lng,
          methanol: fuel.methanol,
          biofuel:  fuel.biofuel,
          total:    totalFuel,
        },
        distanceTravelledNm: distanceNm,
        hoursUnderway: Math.round(hoursAtSea),
        deadweightTonnes: v.dwt,
      };
    }),
  );

  return {
    reportType: 'IMO_DCS',
    regulationRef: 'MARPOL Annex VI Regulation 22A',
    reportingYear: year,
    companyName: org.name,
    generatedAt: new Date().toISOString(),
    vessels: vesselData,
  };
}

// ─────────────────────────────────────────────
// CII STATEMENT OF COMPLIANCE
// MEPC.337(76) / MEPC.354(78)
// Annual rating certificate issued after survey
// ─────────────────────────────────────────────

export async function generateCiiComplianceReport(organizationId: string, year: number) {
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
  const records = await prisma.ciiRecord.findMany({
    where: { year, vessel: { organizationId } },
    include: { vessel: true },
    orderBy: { rating: 'asc' },
  });

  return {
    reportType: 'CII_STATEMENT',
    regulationRef: 'IMO MEPC.337(76) + MEPC.354(78)',
    reportingYear: year,
    companyName: org.name,
    generatedAt: new Date().toISOString(),
    vessels: records.map((r) => ({
      imo: r.vessel.imo,
      name: r.vessel.name,
      type: r.vessel.type,
      flag: r.vessel.flag,
      dwt: r.vessel.dwt,
      attainedCii: r.attainedCii,
      requiredCii: r.requiredCii,
      ciiRatio: r.ciiRatio,
      rating: r.rating,
      totalCo2G: r.totalCo2G,
      totalDistanceNm: r.totalDistanceNm,
      yearEndProjection: r.yearEndProjection,
      iceCorrectionApplied: r.iceCorrectionApplied,
    })),
    summary: {
      totalVessels: records.length,
      ratingA: records.filter((r) => r.rating === 'A').length,
      ratingB: records.filter((r) => r.rating === 'B').length,
      ratingC: records.filter((r) => r.rating === 'C').length,
      ratingD: records.filter((r) => r.rating === 'D').length,
      ratingE: records.filter((r) => r.rating === 'E').length,
    },
  };
}

// ─────────────────────────────────────────────
// FUELEU ANNUAL COMPLIANCE REPORT
// Regulation (EU) 2023/1805 Article 8
// Submitted to administering authority by 31 January following year
// ─────────────────────────────────────────────

export async function generateFuelEuReport(organizationId: string, year: number) {
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
  const records = await prisma.fuelEuRecord.findMany({
    where: { year, vessel: { organizationId } },
    include: { vessel: true },
    orderBy: { ghgGap: 'desc' },
  });

  const totalPenalty = records.reduce((s, r) => s + r.penaltyEur, 0);
  const compliantCount = records.filter((r) => r.isCompliant).length;

  return {
    reportType: 'FUELEU_ANNUAL',
    regulationRef: 'Regulation (EU) 2023/1805 Article 8',
    reportingYear: year,
    submissionDeadline: `${year + 1}-01-31`,
    companyName: org.name,
    generatedAt: new Date().toISOString(),
    vessels: records.map((r) => ({
      imo: r.vessel.imo,
      name: r.vessel.name,
      type: r.vessel.type,
      flag: r.vessel.flag,
      totalEnergyMj: r.totalEnergyMj,
      actualGhgIntensity: r.actualGhgIntensity,
      targetGhgIntensity: r.targetGhgIntensity,
      ghgGap: r.ghgGap,
      isCompliant: r.isCompliant,
      penaltyEur: r.penaltyEur,
      poolSurplusMj: r.poolSurplusMj,
      poolBorrowedMj: r.poolBorrowedMj,
    })),
    summary: {
      totalVessels: records.length,
      compliantVessels: compliantCount,
      nonCompliantVessels: records.length - compliantCount,
      totalPenaltyEur: totalPenalty,
      totalEnergyMj: records.reduce((s, r) => s + r.totalEnergyMj, 0),
    },
  };
}

// ─────────────────────────────────────────────
// EEXI TECHNICAL FILE SUMMARY
// MEPC.333(76) Regulation 27
// One-time document, available for inspection
// ─────────────────────────────────────────────

export async function generateEexiReport(organizationId: string) {
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
  const vessels = await prisma.vessel.findMany({
    where: { organizationId },
    include: { eexiRecord: true },
    orderBy: { name: 'asc' },
  });

  return {
    reportType: 'EEXI_TECHNICAL_FILE',
    regulationRef: 'IMO MEPC.333(76) Regulation 27 — mandatory from 1 Jan 2023',
    companyName: org.name,
    generatedAt: new Date().toISOString(),
    vessels: vessels.map((v) => ({
      imo: v.imo,
      name: v.name,
      type: v.type,
      flag: v.flag,
      dwt: v.dwt,
      gt: v.gt,
      yearBuilt: v.yearBuilt,
      attainedEexi: v.eexiRecord?.attainedEexi ?? null,
      requiredEexi: v.eexiRecord?.requiredEexi ?? null,
      isCompliant: v.eexiRecord?.isCompliant ?? null,
      enginePowerLimitKw: v.eexiRecord?.enginePowerLimitKw ?? null,
      shaPowerLimitKw: v.eexiRecord?.shaPowerLimitKw ?? null,
      certificateNumber: v.eexiRecord?.certificateNumber ?? null,
      certifiedAt: v.eexiRecord?.certifiedAt?.toISOString() ?? null,
      certifiedBy: v.eexiRecord?.certifiedBy ?? null,
      certified: v.eexiRecord != null,
    })),
    summary: {
      totalVessels: vessels.length,
      certified: vessels.filter((v) => v.eexiRecord != null).length,
      compliant: vessels.filter((v) => v.eexiRecord?.isCompliant).length,
      eplRequired: vessels.filter((v) => v.eexiRecord && !v.eexiRecord.isCompliant).length,
      pending: vessels.filter((v) => !v.eexiRecord).length,
    },
  };
}

// ─────────────────────────────────────────────
// FLEET CARBON EXECUTIVE SUMMARY
// Internal report combining all modules
// ─────────────────────────────────────────────

export async function generateFleetSummary(organizationId: string, year: number) {
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
  const vessels = await getVesselsForOrg(organizationId);

  // Aggregate all modules
  const [ciiRecords, etsRecords, fuelEuRecords, eexiVessels, credits] = await Promise.all([
    prisma.ciiRecord.findMany({ where: { year, vessel: { organizationId } } }),
    prisma.etsRecord.findMany({ where: { year, vessel: { organizationId } } }),
    prisma.fuelEuRecord.findMany({ where: { year, vessel: { organizationId } } }),
    prisma.vessel.findMany({ where: { organizationId }, include: { eexiRecord: true } }),
    prisma.carbonCredit.findMany({ where: { organizationId, status: 'active' } }),
  ]);

  const totalCo2Mt = ciiRecords.reduce((s, r) => s + r.totalCo2G / 1_000_000, 0);
  const etsObligation = etsRecords.reduce((s, r) => s + r.obligationMt, 0);
  const etsShortfall = etsRecords.reduce((s, r) => s + Math.max(0, r.obligationMt - r.euaSurrendered), 0);
  const fuelEuPenalty = fuelEuRecords.reduce((s, r) => s + r.penaltyEur, 0);
  const activeCredits = credits.reduce((s, c) => s + c.quantity, 0);
  const eexiCompliant = eexiVessels.filter((v) => v.eexiRecord?.isCompliant).length;

  return {
    reportType: 'FLEET_SUMMARY',
    reportingYear: year,
    companyName: org.name,
    generatedAt: new Date().toISOString(),
    fleetSize: vessels.length,
    modules: {
      cii: {
        recordsCount: ciiRecords.length,
        totalCo2Mt: Math.round(totalCo2Mt * 100) / 100,
        ratingDistribution: {
          A: ciiRecords.filter((r) => r.rating === 'A').length,
          B: ciiRecords.filter((r) => r.rating === 'B').length,
          C: ciiRecords.filter((r) => r.rating === 'C').length,
          D: ciiRecords.filter((r) => r.rating === 'D').length,
          E: ciiRecords.filter((r) => r.rating === 'E').length,
        },
        atRiskVessels: ciiRecords.filter((r) => r.rating === 'D' || r.rating === 'E').length,
      },
      ets: {
        totalObligationMt: Math.round(etsObligation * 100) / 100,
        totalShortfallMt: Math.round(etsShortfall * 100) / 100,
        settledVessels: etsRecords.filter((r) => r.isSettled).length,
        totalVessels: etsRecords.length,
      },
      fuelEu: {
        compliantVessels: fuelEuRecords.filter((r) => r.isCompliant).length,
        totalVessels: fuelEuRecords.length,
        totalPenaltyEur: Math.round(fuelEuPenalty),
      },
      eexi: {
        certifiedVessels: eexiVessels.filter((v) => v.eexiRecord != null).length,
        compliantVessels: eexiCompliant,
        totalVessels: eexiVessels.length,
      },
      credits: {
        activeCredits: Math.round(activeCredits),
        netVsEtsShortfall: Math.round(activeCredits - etsShortfall),
      },
    },
  };
}
