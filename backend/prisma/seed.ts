/**
 * CarbonX seed data — development only
 * Creates a sample organization, vessels, voyages, and CII records
 */

import { PrismaClient } from '../generated/prisma/index.js';
import { ciiService } from '../src/services/cii/cii-service.js';
import { CO2_FACTORS } from '../src/services/cii/cii-calculator.js';
import { hashPassword } from '../src/lib/crypto.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding CarbonX development data...');

  // Organization
  const org = await prisma.organization.upsert({
    where: { code: 'ANKR_SHIPPING' },
    update: {},
    create: {
      name: 'ANKR Shipping Ltd',
      code: 'ANKR_SHIPPING',
      type: 'shipowner',
    },
  });
  console.log(`✓ Organization: ${org.name}`);

  // Admin user
  await prisma.user.upsert({
    where: { email: 'admin@carbonx.ankr.in' },
    update: {},
    create: {
      email: 'admin@carbonx.ankr.in',
      name: 'CarbonX Admin',
      passwordHash: hashPassword('Admin1234!'),
      role: 'admin',
      organizationId: org.id,
    },
  });

  // Sample fleet
  const fleet = [
    { imo: '9400791', name: 'Ananda Bharat',  type: 'bulker',    flag: 'IN', dwt: 76_000, gt: 42_000, yearBuilt: 2009 },
    { imo: '9743221', name: 'Pacific Spirit',  type: 'tanker',    flag: 'MH', dwt: 115_000, gt: 62_000, yearBuilt: 2016 },
    { imo: '9501234', name: 'Cargo Express',   type: 'container', flag: 'SG', dwt: 47_000, gt: 54_000, yearBuilt: 2011 },
    { imo: '9615432', name: 'LNG Pioneer',     type: 'lng_carrier', flag: 'BS', dwt: 85_000, gt: 98_000, yearBuilt: 2014 },
    { imo: '9812345', name: 'Baltic Wind',     type: 'general_cargo', flag: 'CY', dwt: 12_000, gt: 8_500, yearBuilt: 2008 },
  ];

  const vessels = [];
  for (const v of fleet) {
    const vessel = await prisma.vessel.upsert({
      where: { imo: v.imo },
      update: { name: v.name },
      create: { ...v, organizationId: org.id },
    });
    vessels.push(vessel);
    console.log(`  ✓ Vessel: ${vessel.name} (${vessel.type})`);
  }

  // Generate sample voyages for 2024 and 2025
  for (const vessel of vessels) {
    for (const year of [2024, 2025]) {
      await generateVoyagesForVessel(vessel, year, org.id);
    }
  }

  // Calculate CII for all vessels
  console.log('\n📊 Calculating CII records...');
  for (const vessel of vessels) {
    for (const year of [2024, 2025]) {
      await ciiService.calculateAndPersist(vessel.id, year, prisma);
      const record = await prisma.ciiRecord.findUnique({
        where: { vesselId_year: { vesselId: vessel.id, year } },
        select: { rating: true, ciiRatio: true },
      });
      console.log(`  ${vessel.name} ${year}: Rating ${record?.rating} (ratio ${record?.ciiRatio?.toFixed(3)})`);
    }
  }

  console.log('\n✅ Seed complete!');
  console.log(`\nLogin: admin@carbonx.ankr.in`);
  console.log(`GraphQL: http://localhost:4053/graphql`);
}

async function generateVoyagesForVessel(
  vessel: { id: string; type: string; dwt: number },
  year: number,
  orgId: string,
) {
  const ROUTES = [
    { dep: 'Mumbai', arr: 'Singapore', depCountry: 'IN', arrCountry: 'SG', nm: 2_400 },
    { dep: 'Singapore', arr: 'Rotterdam', depCountry: 'SG', arrCountry: 'NL', nm: 8_400 },
    { dep: 'Rotterdam', arr: 'New York', depCountry: 'NL', arrCountry: 'US', nm: 3_500 },
    { dep: 'New York', arr: 'Santos', depCountry: 'US', arrCountry: 'BR', nm: 4_800 },
    { dep: 'Santos', arr: 'Cape Town', depCountry: 'BR', arrCountry: 'ZA', nm: 3_900 },
    { dep: 'Cape Town', arr: 'Mumbai', depCountry: 'ZA', arrCountry: 'IN', nm: 4_200 },
  ];

  // Fuel consumption varies by vessel type
  const fuelPerNm = vessel.type === 'lng_carrier' ? 0.025
    : vessel.type === 'container' ? 0.018
    : vessel.type === 'tanker' ? 0.022
    : 0.015; // bulker, general cargo

  let depDate = new Date(`${year}-01-15`);

  for (const route of ROUTES) {
    const hfo = route.nm * fuelPerNm;
    const mgo = route.nm * 0.002;
    const co2 = hfo * CO2_FACTORS.hfo + mgo * CO2_FACTORS.mgo;

    const arr = new Date(depDate.getTime() + (route.nm / 14) * 24 * 3600 * 1000); // ~14 kts

    await prisma.voyage.create({
      data: {
        vesselId: vessel.id,
        voyageNumber: `V${year}-${route.dep.slice(0, 3).toUpperCase()}${route.arr.slice(0, 3).toUpperCase()}`,
        departurePort: route.dep,
        arrivalPort: route.arr,
        departurePortCountry: route.depCountry,
        arrivalPortCountry: route.arrCountry,
        departureAt: depDate,
        arrivalAt: arr,
        distanceNm: route.nm,
        hfoConsumedMt: hfo,
        mgoConsumedMt: mgo,
        co2EmissionsMt: co2,
        etsScope: route.arrCountry === 'NL' || route.depCountry === 'NL' ? 'eu_non_eu' : 'none',
        status: 'completed',
      },
    });

    depDate = new Date(arr.getTime() + 5 * 24 * 3600 * 1000); // 5-day port stay
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
