/**
 * Carbon Credits Service
 * Voluntary Carbon Market (VCM) portfolio management
 *
 * Supported standards: Gold Standard, Verra VCS, Plan Vivo, ACR, CAR
 * Credit lifecycle: active → retired | for_sale | cancelled
 */

import { prisma } from '../../lib/prisma.js';
import { logger } from '../../utils/logger.js';

// ─────────────────────────────────────────────
// STANDARD METADATA
// ─────────────────────────────────────────────

export const CREDIT_STANDARDS = {
  gold_standard: {
    name: 'Gold Standard',
    shortName: 'GS',
    registry: 'Gold Standard Impact Registry',
    url: 'https://registry.goldstandard.org',
    quality: 'high',
  },
  verra_vcs: {
    name: 'Verra VCS',
    shortName: 'VCS',
    registry: 'Verra Registry (VCU)',
    url: 'https://registry.verra.org',
    quality: 'high',
  },
  plan_vivo: {
    name: 'Plan Vivo',
    shortName: 'PV',
    registry: 'Plan Vivo Registry',
    url: 'https://www.planvivo.org',
    quality: 'high',
  },
  american_carbon_registry: {
    name: 'American Carbon Registry',
    shortName: 'ACR',
    registry: 'ACR Registry',
    url: 'https://americancarbonregistry.org',
    quality: 'medium',
  },
  climate_action_reserve: {
    name: 'Climate Action Reserve',
    shortName: 'CAR',
    registry: 'CAR Registry',
    url: 'https://www.climateactionreserve.org',
    quality: 'medium',
  },
} as const;

export const PROJECT_TYPES = [
  'redd_plus',          // Avoided Deforestation
  'afforestation',      // Tree planting / reforestation
  'improved_forest',    // Improved Forest Management
  'renewable_energy',   // Wind, solar, hydro
  'methane_capture',    // Landfill gas, livestock
  'blue_carbon',        // Mangroves, seagrasses, tidal
  'clean_cookstoves',   // Household energy efficiency
  'industrial_efficiency',
  'direct_air_capture', // DAC (premium, engineered removal)
  'biochar',
  'enhanced_weathering',
  'ocean_alkalinity',
] as const;

// ─────────────────────────────────────────────
// PORTFOLIO ANALYTICS
// ─────────────────────────────────────────────

export async function getPortfolio(organizationId: string) {
  const credits = await prisma.carbonCredit.findMany({
    where: { organizationId },
    orderBy: [{ vintage: 'desc' }, { createdAt: 'desc' }],
  });

  const active   = credits.filter((c) => c.status === 'active');
  const retired  = credits.filter((c) => c.status === 'retired');
  const forSale  = credits.filter((c) => c.status === 'for_sale');

  const totalActive  = active.reduce((s, c) => s + c.quantity, 0);
  const totalRetired = retired.reduce((s, c) => s + c.quantity, 0);
  const totalForSale = forSale.reduce((s, c) => s + c.quantity, 0);

  // Weighted avg price of active credits
  const activeWithPrice = active.filter((c) => c.priceUsd != null);
  const avgPriceUsd = activeWithPrice.length > 0
    ? activeWithPrice.reduce((s, c) => s + (c.priceUsd ?? 0) * c.quantity, 0)
      / activeWithPrice.reduce((s, c) => s + c.quantity, 0)
    : 0;

  // Portfolio value
  const portfolioValueUsd = active.reduce((s, c) => s + (c.priceUsd ?? 0) * c.quantity, 0);

  // By standard
  const byStandard = Object.entries(
    active.reduce((acc, c) => {
      acc[c.standard] = (acc[c.standard] ?? 0) + c.quantity;
      return acc;
    }, {} as Record<string, number>),
  ).map(([standard, quantity]) => ({ standard, quantity }));

  // By vintage
  const byVintage = Object.entries(
    active.reduce((acc, c) => {
      acc[c.vintage] = (acc[c.vintage] ?? 0) + c.quantity;
      return acc;
    }, {} as Record<number, number>),
  )
    .map(([vintage, quantity]) => ({ vintage: Number(vintage), quantity }))
    .sort((a, b) => a.vintage - b.vintage);

  // By project type
  const byType = Object.entries(
    active.reduce((acc, c) => {
      acc[c.projectType] = (acc[c.projectType] ?? 0) + c.quantity;
      return acc;
    }, {} as Record<string, number>),
  ).map(([projectType, quantity]) => ({ projectType, quantity }));

  return {
    totalActive,
    totalRetired,
    totalForSale,
    avgPriceUsd,
    portfolioValueUsd,
    byStandard,
    byVintage,
    byType,
    credits,
  };
}

// ─────────────────────────────────────────────
// PURCHASE credits (add to portfolio)
// ─────────────────────────────────────────────

export async function purchaseCredits(input: {
  organizationId: string;
  standard: string;
  projectId: string;
  projectName: string;
  projectType: string;
  country: string;
  vintage: number;
  quantity: number;
  priceUsd?: number;
  registryUrl?: string;
  serialNumber?: string;
}) {
  const credit = await prisma.carbonCredit.create({
    data: {
      ...input,
      status: 'active',
    },
  });

  logger.info(
    { id: credit.id, projectName: input.projectName, quantity: input.quantity, standard: input.standard },
    `Carbon credit purchased: ${input.quantity} tCO₂ from ${input.projectName}`,
  );
  return credit;
}

// ─────────────────────────────────────────────
// RETIRE credits (permanent cancellation)
// ─────────────────────────────────────────────

export async function retireCredits(
  creditId: string,
  quantityToRetire: number,
  retiredFor: string,
  organizationId: string,
) {
  const credit = await prisma.carbonCredit.findFirstOrThrow({
    where: { id: creditId, organizationId },
  });

  if (credit.status !== 'active') {
    throw new Error(`Credit ${creditId} is not active (status: ${credit.status})`);
  }
  if (quantityToRetire > credit.quantity) {
    throw new Error(
      `Cannot retire ${quantityToRetire} tCO₂ — only ${credit.quantity} available`,
    );
  }

  // Partial retirement: split into retired + remaining active
  if (quantityToRetire < credit.quantity) {
    const remaining = credit.quantity - quantityToRetire;
    await prisma.$transaction([
      // Update original to remaining quantity (stays active)
      prisma.carbonCredit.update({
        where: { id: creditId },
        data: { quantity: remaining },
      }),
      // Create retired record
      prisma.carbonCredit.create({
        data: {
          organizationId,
          standard: credit.standard,
          projectId: credit.projectId,
          projectName: credit.projectName,
          projectType: credit.projectType,
          country: credit.country,
          vintage: credit.vintage,
          quantity: quantityToRetire,
          priceUsd: credit.priceUsd,
          registryUrl: credit.registryUrl,
          serialNumber: credit.serialNumber
            ? `${credit.serialNumber}-RET`
            : undefined,
          status: 'retired',
          retiredAt: new Date(),
          retiredFor,
        },
      }),
    ]);
  } else {
    // Full retirement
    await prisma.carbonCredit.update({
      where: { id: creditId },
      data: { status: 'retired', retiredAt: new Date(), retiredFor },
    });
  }

  logger.info(
    { creditId, quantityToRetire, retiredFor },
    `Carbon credits retired: ${quantityToRetire} tCO₂ for "${retiredFor}"`,
  );

  return { retired: quantityToRetire, retiredFor };
}

// ─────────────────────────────────────────────
// LIST credits for sale
// ─────────────────────────────────────────────

export async function listForSale(creditId: string, organizationId: string) {
  return prisma.carbonCredit.update({
    where: { id: creditId, organizationId } as any,
    data: { status: 'for_sale' },
  });
}

// ─────────────────────────────────────────────
// NET OFFSET POSITION vs obligations
// ─────────────────────────────────────────────

export async function getNetOffsetPosition(organizationId: string, year: number) {
  // Total active credits available
  const credits = await prisma.carbonCredit.findMany({
    where: { organizationId, status: 'active' },
  });
  const totalCreditsAvail = credits.reduce((s, c) => s + c.quantity, 0);

  // ETS shortfall
  const etsRecords = await prisma.etsRecord.findMany({
    where: { year, vessel: { organizationId }, isSettled: false },
  });
  const etsShortfall = etsRecords.reduce(
    (s, r) => s + Math.max(0, r.obligationMt - r.euaSurrendered),
    0,
  );

  // FuelEU penalty (as CO2 equivalent gap — approximation)
  const fuelEuRecords = await prisma.fuelEuRecord.findMany({
    where: { year, vessel: { organizationId }, isCompliant: false },
  });
  const fuelEuPenaltyEur = fuelEuRecords.reduce((s, r) => s + r.penaltyEur, 0);

  // CII at-risk vessels
  const ciiRecords = await prisma.ciiRecord.findMany({
    where: {
      year,
      vessel: { organizationId },
      rating: { in: ['D', 'E'] },
    },
  });

  return {
    totalCreditsAvail,
    etsShortfallMt: etsShortfall,
    fuelEuPenaltyEur,
    atRiskCiiVessels: ciiRecords.length,
    coverageRatio: etsShortfall > 0 ? totalCreditsAvail / etsShortfall : null,
    netPosition: totalCreditsAvail - etsShortfall,
  };
}
