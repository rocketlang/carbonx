# CarbonX — Maritime Carbon Compliance & Trading Platform
## Project Report, Architecture & Complete TODO

**Version:** 1.0.0
**Date:** 2026-02-17
**Stack:** Mari8X-pattern (Fastify + Pothos + Prisma + React 19)
**Ports:** Backend `4053` · Frontend `3013`
**Domain:** `carbonx.ankr.in` · `carbonx.mari8x.com`
**Database:** `carbonx` (PostgreSQL)
**Repo:** `https://github.com/rocketlang/carbonx`

---

## 1. Executive Summary

CarbonX is a full-stack SaaS platform that gives shipowners, operators, and charterers a single command center for maritime carbon compliance and cost management.

**The regulatory wave hitting shipping in 2024–2026:**

| Regulation | Effective | Scope | Risk of Non-Compliance |
|---|---|---|---|
| IMO CII (Carbon Intensity Indicator) | Jan 2023 | All vessels ≥5000 GT | E-rating = PSC detentions, charter rejection |
| EU ETS (Emissions Trading System) | Jan 2024 | Vessels ≥5000 GT on EU routes | €90–€150/tonne CO₂ fines |
| FuelEU Maritime | Jan 2025 | Vessels ≥5000 GT | Penalty: €2,400/tonne GHG shortfall |
| EEXI (Energy Efficiency Existing Ship) | Jan 2023 | All vessels ≥400 GT | Cannot trade without certificate |
| IMO DCS (Data Collection System) | Jan 2019 → rolling | Flag state reporting | Port bans |

**CarbonX solves:**
- Real-time CII rating with voyage-level drill-down
- EU ETS allowance tracking, purchasing workflow, and cost optimization
- FuelEU compliance monitoring and penalty forecasting
- EEXI certification management
- Carbon credit marketplace (voluntary offsets)
- Automated regulatory report generation (IMO DCS, EU MRV, SEEMP III)

---

## 2. Why It's a Gamechanger

### 2.1 Market Gap
No dominant SME SaaS player exists. Current solutions:
- **Veson Nautical / RightShip** — Enterprise-only, $50K–$500K/year
- **DNV Veracity** — Complex, requires DNV relationship
- **Excel spreadsheets** — Used by 80% of operators today
- **CarbonX** — Affordable, integrated with Mari8X vessel data, API-first

### 2.2 Integration Advantage
CarbonX sits natively inside the ANKR maritime ecosystem:

```
Mari8X (vessel positions + voyages)
    └─→ CarbonX (emission calculations + compliance)
            └─→ FreightBox (charter party carbon clauses)
            └─→ Fr8X (spot market carbon cost pass-through)
```

Existing `vessel-emission.ts` schema in Mari8X is the foundation — CarbonX expands it into a full compliance engine.

### 2.3 Revenue Model

| Tier | Price/month | Fleet Size | Features |
|---|---|---|---|
| Starter | $299 | 1–5 vessels | CII dashboard, basic reporting |
| Growth | $799 | 6–20 vessels | + EU ETS tracking, FuelEU |
| Fleet | $2,499 | 21–100 vessels | + Carbon marketplace, EEXI |
| Enterprise | Custom | 100+ vessels | + White-label, API access |

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CarbonX Platform                          │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Frontend (Port 3009)                    │   │
│  │  React 19 + Vite + Apollo Client + Tailwind + Recharts   │   │
│  │                                                            │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │   CII    │ │  EU ETS  │ │ FuelEU   │ │  Fleet   │   │   │
│  │  │Dashboard │ │ Tracker  │ │ Monitor  │ │Analytics │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │  Carbon  │ │  EEXI    │ │ Reports  │ │  Market  │   │   │
│  │  │ Credits  │ │ Manager  │ │Generator │ │ Rates    │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │ GraphQL                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Backend (Port 4052)                     │   │
│  │         Fastify 5 + Pothos + Prisma 6 + Mercurius        │   │
│  │                                                            │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │                 GraphQL Schema                    │   │   │
│  │  │  types/cii.ts  types/ets.ts  types/fueleu.ts    │   │   │
│  │  │  types/eexi.ts  types/carbon-credit.ts           │   │   │
│  │  │  types/fleet-carbon.ts  types/dcs-report.ts      │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  │                                                            │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │   │
│  │  │CII Service  │ │ETS Service  │ │FuelEU Svc   │       │   │
│  │  │(IMO formulas│ │(allowance   │ │(GHG intensity│       │   │
│  │  │ CII A-E)    │ │ management) │ │ compliance) │       │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘       │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │   │
│  │  │EEXI Service │ │Marketplace  │ │Reporting Svc│       │   │
│  │  │(AER, EEDI   │ │(carbon credit│ │(IMO DCS,    │       │   │
│  │  │ compliance) │ │ matching)   │ │ EU MRV)     │       │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘       │   │
│  │                                                            │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │              Background Jobs (BullMQ)            │    │   │
│  │  │  Daily CII recalculation · ETS price feed       │    │   │
│  │  │  FuelEU compliance check · Report generation    │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │               Data Layer                                   │   │
│  │  PostgreSQL (carbonx db) · Redis (cache) · BullMQ (jobs) │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │               External Integrations                        │   │
│  │  Mari8X API · EU ETS API (EUTL) · ICE/EEX Carbon Prices  │   │
│  │  Gold Standard API · Verra Registry · IMO GISIS           │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Tech Stack

### Backend
| Technology | Version | Role |
|---|---|---|
| Node.js | 20+ | Runtime |
| TypeScript | 5.7.3 | Type safety |
| Fastify | 5.2.1 | HTTP server |
| Mercurius | 16.0.0 | GraphQL server |
| Pothos | 4.3.0 | Type-safe schema builder |
| Prisma | 6.2.1 | ORM + migrations |
| PostgreSQL | 16 | Primary database |
| Redis | 7 | Cache + job queue |
| BullMQ | 5.x | Background jobs |
| Anthropic SDK | 0.72.1 | AI compliance advisor |
| Zod | 3.24.1 | Input validation |
| Pino | 9.x | Structured logging |

### Frontend
| Technology | Version | Role |
|---|---|---|
| React | 19.0.0 | UI framework |
| Vite | 6.x | Build tool |
| TypeScript | 5.7.3 | Type safety |
| Apollo Client | 3.12.5 | GraphQL client |
| Tailwind CSS | 3.4.x | Styling |
| Shadcn/ui | latest | Component library |
| Recharts | 3.x | Carbon trend charts |
| React Router | 7.x | Routing |
| Zustand | 5.x | State management |
| React Hook Form | 7.x | Forms |

---

## 5. Module Breakdown

### Module 1: CII Engine (Carbon Intensity Indicator)

**Regulation:** IMO MARPOL Annex VI, Resolution MEPC.337(76)
**Formula:** `Attained CII = CO₂ Emissions (g) / (DWT × Distance sailed (nm))`

**Features:**
- IMO-certified CII calculation per vessel per year
- Required CII derivation from reference lines (tanker, bulker, container, etc.)
- Annual rating: A (best) → E (worst)
- Multi-year trend tracking (2023–2030 tightening factors built in)
- Voyage-level CII contribution analysis
- "What-if" speed/fuel optimization simulator
- CII downgrade alert system (D for 3 years = rectification plan required)

**Vessel Type Reference Lines (IMO):**
```
Bulker:     a=4745, c=0.622
Tanker:     a=5247, c=0.610
Container:  a=1984, c=0.489
Gas carrier:a=144.0, c=0.0
Ro-Ro:      a=5739, c=0.631
LNG:        a=9827, c=0.0
```

---

### Module 2: EU ETS Manager

**Regulation:** EU ETS Directive 2003/87/EC (shipping from Jan 2024)
**Scope:** Vessels ≥5,000 GT on EU/EEA routes
**Phase-in:** 40% (2024) → 70% (2025) → 100% (2026)

**Features:**
- Voyage-level EU ETS scope classification (EU-EU, EU-non-EU, non-EU)
- Automatic 40/70/100% phase-in calculation
- EUA (EU Allowance) balance tracking
- Carbon price feed (ICE/EEX live market data)
- Allowance purchasing workflow (buy/hold/surrender)
- Annual surrender deadline alerts (30 April each year)
- Cost optimization: voyage routing to minimize ETS exposure
- P&L integration: ETS cost per charter party

---

### Module 3: FuelEU Maritime

**Regulation:** FuelEU Maritime Regulation (EU) 2023/1805 — effective Jan 2025
**Scope:** Vessels ≥5,000 GT on EU port calls
**Target:** GHG intensity of energy used on board

**Features:**
- GHG intensity calculation (gCO₂eq/MJ) per voyage
- Compliance gap analysis vs annual targets (−2% 2025, −6% 2030 etc.)
- FuelEU penalty calculator (€2,400/tonne GHG shortfall)
- Fuel pooling management (surplus banking/borrowing between vessels)
- Alternative fuel comparison (LNG, methanol, ammonia, biofuel, e-fuels)
- Well-to-wake emission factors per fuel type
- Onshore Power Supply (OPS) credit tracking

---

### Module 4: EEXI Compliance

**Regulation:** IMO MARPOL Annex VI, Resolution MEPC.333(76)
**Effective:** Jan 2023 (one-time certification)

**Features:**
- EEXI value input and compliance verification
- Required EEXI comparison vs attained EEXI
- Engine Power Limitation (EPL) modeling
- Shaft Power Limitation (ShaPoLi) documentation
- EEXI certificate storage and expiry tracking
- SEEMP III document management

---

### Module 5: Carbon Credit Marketplace

**Standards:** Gold Standard, Verra VCS, Plan Vivo
**Purpose:** Voluntary offset purchasing for residual emissions

**Features:**
- Carbon credit catalog (type, price, vintage, co-benefits)
- Retirement workflow (offset against specific voyages/vessels)
- Registry integration (Gold Standard, Verra)
- Portfolio dashboard (owned credits, retired credits, cost basis)
- Carbon neutrality certificate generation
- Third-party verification document storage

---

### Module 6: Fleet Carbon Analytics

**Features:**
- Fleet-wide carbon intensity benchmarking
- Vessel-vs-fleet comparisons
- Historical trend analysis (2023–present)
- Regulatory trajectory forecast (will fleet meet 2030 targets?)
- Carbon cost forecasting (ETS + FuelEU + offset costs)
- Charterer carbon reporting (Scope 3 emissions)
- Port-level emission analysis

---

### Module 7: Regulatory Reporting

**Reports Automated:**
- **IMO DCS** (Data Collection System) — annual fuel oil consumption report
- **EU MRV** (Monitoring, Reporting, Verification) — annual CO₂ report to EU
- **SEEMP III** — Ship Energy Efficiency Management Plan
- **CII Annual Report** — to flag state
- **ETS Annual Report** — to competent authority (30 April deadline)
- **FuelEU Compliance Document** — per vessel per year

---

## 6. Database Schema (Prisma)

### Core Models

```prisma
// carbonx/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
  output   = "../generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────────
// MULTI-TENANCY
// ─────────────────────────────────────────────

model Organization {
  id          String   @id @default(cuid())
  name        String
  code        String   @unique
  type        String   @default("shipowner")   // shipowner, operator, charterer, manager

  vessels     Vessel[]
  users       User[]
  etsAccounts EtsAccount[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@map("organizations")
}

model User {
  id             String       @id @default(cuid())
  email          String       @unique
  name           String
  role           String       @default("operator")
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])

  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  @@index([organizationId])
  @@map("users")
}

// ─────────────────────────────────────────────
// VESSELS
// ─────────────────────────────────────────────

model Vessel {
  id             String       @id @default(cuid())
  imo            String       @unique
  name           String
  type           String       // bulker, tanker, container, gas, ro-ro, lng
  flag           String
  dwt            Float
  gt             Float
  yearBuilt      Int
  enginePowerKw  Float?
  organizationId String
  mari8xVesselId String?      // Link to Mari8X vessel record

  organization   Organization @relation(fields: [organizationId], references: [id])
  voyages        Voyage[]
  ciiRecords     CiiRecord[]
  etsRecords     EtsRecord[]
  fuelEuRecords  FuelEuRecord[]
  eexiRecord     EexiRecord?

  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  @@index([organizationId])
  @@map("vessels")
}

// ─────────────────────────────────────────────
// VOYAGES (fuel consumption source of truth)
// ─────────────────────────────────────────────

model Voyage {
  id                  String   @id @default(cuid())
  vesselId            String
  voyageNumber        String
  departurePort       String
  arrivalPort         String
  departureAt         DateTime
  arrivalAt           DateTime?
  distanceNm          Float    @default(0)

  // Fuel consumption (metric tonnes per fuel type)
  hfoConsumedMt       Float    @default(0)
  mgoConsumedMt       Float    @default(0)
  lngConsumedMt       Float    @default(0)
  methanolConsumedMt  Float    @default(0)
  biofuelConsumedMt   Float    @default(0)

  // Derived emissions
  co2EmissionsMt      Float    @default(0)
  ghgIntensity        Float?   // gCO2eq/MJ for FuelEU

  // EU ETS classification
  etsScope            String   @default("none")  // eu_eu, eu_non_eu, non_eu_eu, none
  etsCo2Applicable    Float    @default(0)       // CO2 subject to ETS

  // Status
  status              String   @default("planned") // planned, in_progress, completed, verified

  vessel              Vessel   @relation(fields: [vesselId], references: [id])

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  @@index([vesselId])
  @@index([etsScope])
  @@map("voyages")
}

// ─────────────────────────────────────────────
// CII RECORDS
// ─────────────────────────────────────────────

model CiiRecord {
  id              String   @id @default(cuid())
  vesselId        String
  year            Int

  // CII calculation inputs
  totalDistanceNm Float    @default(0)
  totalCo2G       Float    @default(0)   // grams
  dwt             Float

  // CII results
  attainedCii     Float?   // g CO2 / (dwt·nm)
  requiredCii     Float?   // reference line value
  ciiRatio        Float?   // attained / required (< 1.0 = good)
  rating          String?  // A, B, C, D, E

  // Correction factors applied
  iceCorrectionApplied  Boolean @default(false)
  shuttleCorrectionApplied Boolean @default(false)

  // Projections
  yearEndProjection String? // projected end-of-year rating

  vessel          Vessel   @relation(fields: [vesselId], references: [id])

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  @@unique([vesselId, year])
  @@index([vesselId])
  @@map("cii_records")
}

// ─────────────────────────────────────────────
// EU ETS
// ─────────────────────────────────────────────

model EtsAccount {
  id             String     @id @default(cuid())
  organizationId String
  accountNumber  String?    // EUTL registry account
  euaBalance     Float      @default(0)    // Current EUA holdings

  organization   Organization @relation(fields: [organizationId], references: [id])
  records        EtsRecord[]
  transactions   EtsTransaction[]

  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt
  @@map("ets_accounts")
}

model EtsRecord {
  id             String     @id @default(cuid())
  vesselId       String
  accountId      String
  year           Int

  // Obligations
  totalCo2Mt     Float      @default(0)    // Total CO2 for year
  applicablePct  Float      @default(0)    // 40/70/100% phase-in
  obligationMt   Float      @default(0)    // CO2 requiring allowances

  // Status
  euaSurrendered Float      @default(0)
  surrenderDeadline DateTime?             // 30 April following year
  isSettled      Boolean    @default(false)

  vessel         Vessel     @relation(fields: [vesselId], references: [id])
  account        EtsAccount @relation(fields: [accountId], references: [id])

  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt
  @@unique([vesselId, year])
  @@map("ets_records")
}

model EtsTransaction {
  id          String     @id @default(cuid())
  accountId   String
  type        String     // buy, sell, surrender, transfer
  euaAmount   Float
  priceEur    Float?     // per EUA
  totalEur    Float?

  account     EtsAccount @relation(fields: [accountId], references: [id])

  transactedAt DateTime
  createdAt    DateTime  @default(now())
  @@map("ets_transactions")
}

// ─────────────────────────────────────────────
// FUELEU MARITIME
// ─────────────────────────────────────────────

model FuelEuRecord {
  id              String   @id @default(cuid())
  vesselId        String
  year            Int

  // GHG intensity
  actualGhgIntensity  Float?    // gCO2eq/MJ achieved
  targetGhgIntensity  Float?    // regulatory limit
  ghgGap              Float?    // actual - target (positive = non-compliant)

  // Compliance
  isCompliant     Boolean  @default(false)
  penaltyEur      Float    @default(0)

  // Pooling
  poolSurplusMj   Float    @default(0)    // excess compliance units
  poolBorrowedMj  Float    @default(0)    // borrowed from future year

  vessel          Vessel   @relation(fields: [vesselId], references: [id])

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  @@unique([vesselId, year])
  @@map("fueleu_records")
}

// ─────────────────────────────────────────────
// EEXI
// ─────────────────────────────────────────────

model EexiRecord {
  id              String   @id @default(cuid())
  vesselId        String   @unique

  attainedEexi    Float?
  requiredEexi    Float?
  isCompliant     Boolean  @default(false)

  enginePowerLimitKw Float?   // if EPL applied
  shaPowerLimitKw    Float?   // if ShaPoLi applied

  certificateNumber  String?
  certifiedAt        DateTime?
  certifiedBy        String?   // classification society

  vessel          Vessel   @relation(fields: [vesselId], references: [id])

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  @@map("eexi_records")
}

// ─────────────────────────────────────────────
// CARBON CREDITS
// ─────────────────────────────────────────────

model CarbonCredit {
  id             String   @id @default(cuid())
  organizationId String

  standard       String   // gold_standard, verra_vcs, plan_vivo
  projectId      String
  projectName    String
  projectType    String   // renewable, forestry, cookstoves, etc.
  country        String
  vintage        Int      // year the credits were generated
  quantity       Float    // tonnes CO2
  priceUsd       Float?   // purchase price per tonne

  status         String   @default("active")  // active, retired
  retiredAt      DateTime?
  retiredFor     String?  // description of offset purpose
  registryUrl    String?
  serialNumber   String?

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  @@map("carbon_credits")
}

// ─────────────────────────────────────────────
// ETS CARBON PRICE FEED
// ─────────────────────────────────────────────

model CarbonPriceFeed {
  id        String   @id @default(cuid())
  type      String   // eu_ets, voluntary_vcs, voluntary_gs
  priceEur  Float
  priceUsd  Float?
  source    String   // ice, eex, xpansiv
  recordedAt DateTime @default(now())

  @@index([type, recordedAt])
  @@map("carbon_price_feed")
}
```

---

## 7. GraphQL API Design

### Key Queries
```graphql
# CII
query FleetCiiDashboard($year: Int!) {
  fleetCiiDashboard(year: $year) {
    totalVessels
    ratingDistribution { rating count }
    avgCiiRatio
    atRiskVessels { id name rating ciiRatio }
  }
}

query VesselCiiTimeline($vesselId: ID!, $fromYear: Int!, $toYear: Int!) {
  vesselCiiTimeline(vesselId: $vesselId, fromYear: $fromYear, toYear: $toYear) {
    year attainedCii requiredCii rating ciiRatio
  }
}

# EU ETS
query EtsObligationSummary($year: Int!) {
  etsObligationSummary(year: $year) {
    totalObligationMt euaBalance shortfallMt estimatedCostEur
    surrenderDeadline vessels { id name obligationMt }
  }
}

# FuelEU
query FuelEuComplianceSummary($year: Int!) {
  fuelEuComplianceSummary(year: $year) {
    compliantVessels nonCompliantVessels totalPenaltyEur
    vessels { id name isCompliant penaltyEur ghgGap }
  }
}

# Carbon Price
query CarbonPrices {
  carbonPrices { euEtsEur voluntaryVcsUsd updatedAt }
}
```

### Key Mutations
```graphql
mutation RecordVoyageFuel($input: VoyageFuelInput!) {
  recordVoyageFuel(input: $input) { id co2EmissionsMt etsCo2Applicable }
}

mutation BuyEtsAllowances($accountId: ID!, $euaAmount: Float!, $priceEur: Float!) {
  buyEtsAllowances(accountId: $accountId, euaAmount: $euaAmount, priceEur: $priceEur) {
    transaction { id euaAmount totalEur }
    account { euaBalance }
  }
}

mutation RetireCarbonCredits($creditId: ID!, $retiredFor: String!) {
  retireCarbonCredits(creditId: $creditId, retiredFor: $retiredFor) {
    id status retiredAt
  }
}

mutation GenerateDcsReport($vesselId: ID!, $year: Int!) {
  generateDcsReport(vesselId: $vesselId, year: $year) {
    reportUrl generatedAt
  }
}
```

---

## 8. External Integrations

| Integration | Data | API |
|---|---|---|
| **Mari8X** | Vessel data, voyage positions | GraphQL (internal) |
| **EU EUTL** | ETS registry, surrender history | EU Commission API |
| **ICE / EEX** | Live EUA carbon prices | Market data API |
| **IMO GISIS** | Vessel certificates, DCS | Web scrape + API |
| **Verra Registry** | VCU carbon credits | REST API |
| **Gold Standard** | GS carbon credits | REST API |
| **EU MRV / THETIS** | MRV verification data | EU Agency portal |
| **Equasis** | Vessel ownership/flag | Web API |

---

## 9. Background Jobs (BullMQ)

| Job | Frequency | Purpose |
|---|---|---|
| `cii-daily-recalc` | Daily 02:00 | Recalculate CII for all active vessels |
| `ets-price-sync` | Every 15 min | Sync EUA price from ICE/EEX |
| `ets-surrender-alert` | Daily | Alert when surrender deadline within 30 days |
| `fueleu-compliance-check` | Weekly | Check FuelEU compliance gaps |
| `cii-downgrade-monitor` | Weekly | Flag vessels approaching D/E rating |
| `dcs-annual-report` | Feb 1 each year | Auto-generate DCS reports |
| `carbon-price-archive` | Daily | Archive daily carbon prices |

---

## 10. Frontend Page Structure

```
/                         → Landing / Login
/dashboard                → Fleet Carbon Overview (all KPIs)
/cii                      → CII Fleet Dashboard
/cii/:vesselId            → Vessel CII Detail (trend + voyages)
/ets                      → EU ETS Account & Obligations
/ets/transactions         → EUA buy/sell/surrender history
/fueleu                   → FuelEU Compliance Monitor
/eexi                     → EEXI Fleet Status
/credits                  → Carbon Credit Portfolio
/credits/marketplace      → Buy Carbon Credits
/analytics                → Fleet Carbon Analytics + Forecasts
/reports                  → Regulatory Report Generator
/reports/:reportId        → Report Detail / Download
/vessels                  → Vessel List
/vessels/:vesselId        → Vessel Carbon Profile
/settings                 → Org settings, integrations, API keys
/admin                    → Admin panel (usage, billing)
```

---

## 11. Complete TODO List

### Phase 1 — Foundation (Week 1–2)

#### Backend Setup
- [ ] `BACK-001` Initialize backend package.json with Fastify 5 + TypeScript 5.7
- [ ] `BACK-002` Configure Prisma 6 with PostgreSQL connection
- [ ] `BACK-003` Write full Prisma schema (all models from Section 6)
- [ ] `BACK-004` Run initial Prisma migration + seed data
- [ ] `BACK-005` Setup Pothos schema builder (builder.ts, context.ts)
- [ ] `BACK-006` Configure Mercurius GraphQL server in main.ts
- [ ] `BACK-007` Add JWT authentication middleware (fastify-jwt)
- [ ] `BACK-008` Setup Redis client + BullMQ worker
- [ ] `BACK-009` Configure Pino structured logging with correlation IDs
- [ ] `BACK-010` Add Zod validation helpers
- [ ] `BACK-011` Register service in `.ankr/config/services.json` (port 4052)
- [ ] `BACK-012` Register port in `.ankr/config/ports.json`

#### Frontend Setup
- [ ] `FRONT-001` Initialize Vite + React 19 + TypeScript project
- [ ] `FRONT-002` Configure Tailwind CSS + Shadcn/ui
- [ ] `FRONT-003` Setup Apollo Client with GraphQL codegen
- [ ] `FRONT-004` Configure React Router 7 with page structure
- [ ] `FRONT-005` Setup Zustand stores (auth, fleet, ets, ui)
- [ ] `FRONT-006` Build Layout component (sidebar + topbar)
- [ ] `FRONT-007` Build auth pages (Login, Register)
- [ ] `FRONT-008` Register frontend in services.json (port 3009)

---

### Phase 2 — CII Engine (Week 2–3)

- [ ] `CII-001` Implement `calculateCiiReferenceLines()` for all vessel types (IMO MEPC.337)
- [ ] `CII-002` Implement `calculateAttainedCII()` from fuel consumption + distance
- [ ] `CII-003` Implement `getCiiRating()` — A/B/C/D/E against required CII
- [ ] `CII-004` Implement annual CII reduction factors (2023–2030 trajectory)
- [ ] `CII-005` Apply correction factors (ice class, shuttle tankers)
- [ ] `CII-006` Write `types/cii.ts` GraphQL schema with Pothos
- [ ] `CII-007` Queries: `vesselCiiRecord`, `vesselCiiTimeline`, `fleetCiiDashboard`
- [ ] `CII-008` Mutations: `calculateCiiRecord`, `updateCiiCorrections`
- [ ] `CII-009` BullMQ job: `cii-daily-recalc` (nightly recalculation)
- [ ] `CII-010` BullMQ job: `cii-downgrade-monitor` (D/E rating alerts)
- [ ] `FRONT-CII-001` Fleet CII dashboard page with rating distribution pie chart
- [ ] `FRONT-CII-002` Vessel CII detail page (year-over-year bar chart)
- [ ] `FRONT-CII-003` CII trajectory forecast chart (2023–2030 with tightening)
- [ ] `FRONT-CII-004` Voyage-level CII contribution table
- [ ] `FRONT-CII-005` CII "What-if" speed/fuel optimization simulator
- [ ] `FRONT-CII-006` At-risk vessels panel (D/E rating alerts)

---

### Phase 3 — EU ETS (Week 3–4)

- [ ] `ETS-001` Implement EU ETS scope classification logic (EU-EU, EU-non-EU, etc.)
- [ ] `ETS-002` Implement phase-in percentage by year (40/70/100%)
- [ ] `ETS-003` Calculate EUA obligation per vessel per year
- [ ] `ETS-004` ETS account CRUD (create, view, update balance)
- [ ] `ETS-005` ETS transaction recording (buy, sell, surrender, transfer)
- [ ] `ETS-006` Write `types/ets.ts` GraphQL schema
- [ ] `ETS-007` Queries: `etsAccount`, `etsObligationSummary`, `etsTransactions`
- [ ] `ETS-008` Mutations: `createEtsAccount`, `buyEtsAllowances`, `surrenderEtsAllowances`, `recordEtsTransaction`
- [ ] `ETS-009` BullMQ job: `ets-price-sync` (EUA price every 15 min from ICE)
- [ ] `ETS-010` BullMQ job: `ets-surrender-alert` (30-day deadline warning)
- [ ] `ETS-011` Carbon price feed storage + historical query
- [ ] `FRONT-ETS-001` ETS obligations dashboard (balance vs obligation chart)
- [ ] `FRONT-ETS-002` EUA price chart (live + historical)
- [ ] `FRONT-ETS-003` Buy/sell EUA allowances modal
- [ ] `FRONT-ETS-004` Surrender workflow (annual 30 April deadline)
- [ ] `FRONT-ETS-005` Voyage-level ETS cost breakdown table
- [ ] `FRONT-ETS-006` ETS cost forecast (remaining year projection)

---

### Phase 4 — FuelEU Maritime (Week 4–5)

- [ ] `FUELEU-001` Implement GHG intensity calculation (well-to-wake per fuel type)
- [ ] `FUELEU-002` Implement fuel-specific emission factors (HFO, MGO, LNG, methanol, biofuel)
- [ ] `FUELEU-003` Calculate compliance gap vs annual targets (2025–2050 step targets)
- [ ] `FUELEU-004` Calculate FuelEU penalty (€2,400 × shortfall in MJ)
- [ ] `FUELEU-005` Implement pooling mechanism (surplus/borrow between vessels)
- [ ] `FUELEU-006` OPS (Onshore Power Supply) credit calculation
- [ ] `FUELEU-007` Write `types/fueleu.ts` GraphQL schema
- [ ] `FUELEU-008` Queries: `fuelEuRecord`, `fuelEuComplianceSummary`, `fuelEuPoolBalance`
- [ ] `FUELEU-009` Mutations: `calculateFuelEuRecord`, `addToFuelEuPool`, `recordOpsCredit`
- [ ] `FUELEU-010` Alternative fuel scenario modelling (what if 10% biofuel blend?)
- [ ] `FRONT-FUELEU-001` FuelEU compliance dashboard
- [ ] `FRONT-FUELEU-002` Penalty forecast by vessel
- [ ] `FRONT-FUELEU-003` Alternative fuel comparison tool
- [ ] `FRONT-FUELEU-004` Fuel pooling management UI

---

### Phase 5 — EEXI & Voyage Data (Week 5–6)

- [ ] `EEXI-001` EEXI data input (attained, required, EPL/ShaPoLi)
- [ ] `EEXI-002` EEXI compliance verification
- [ ] `EEXI-003` SEEMP III document storage
- [ ] `EEXI-004` Write `types/eexi.ts` GraphQL schema
- [ ] `EEXI-005` Certificate upload + expiry tracking
- [ ] `VOYAGE-001` Voyage creation with fuel consumption inputs
- [ ] `VOYAGE-002` Fuel consumption validation (sanity checks vs vessel capacity)
- [ ] `VOYAGE-003` Bulk voyage import (CSV / Excel upload)
- [ ] `VOYAGE-004` Mari8X integration: auto-pull voyage data via internal API
- [ ] `VOYAGE-005` Voyage verification workflow (operator → compliance officer → locked)
- [ ] `FRONT-EEXI-001` EEXI fleet status table
- [ ] `FRONT-VOYAGE-001` Voyage log table with fuel entry form
- [ ] `FRONT-VOYAGE-002` Bulk CSV import UI

---

### Phase 6 — Carbon Marketplace (Week 6–7)

- [ ] `MKT-001` Carbon credit CRUD (add to portfolio)
- [ ] `MKT-002` Verra VCS API integration (browse + purchase)
- [ ] `MKT-003` Gold Standard API integration (browse + purchase)
- [ ] `MKT-004` Credit retirement workflow (link to vessel/voyage)
- [ ] `MKT-005` Carbon neutrality certificate generation (PDF)
- [ ] `MKT-006` Write `types/carbon-credit.ts` GraphQL schema
- [ ] `FRONT-MKT-001` Carbon credit portfolio dashboard
- [ ] `FRONT-MKT-002` Marketplace browse + filter UI
- [ ] `FRONT-MKT-003` Retirement workflow modal
- [ ] `FRONT-MKT-004` Carbon neutrality certificate download

---

### Phase 7 — Reporting & Analytics (Week 7–8)

- [ ] `RPT-001` IMO DCS report generator (annual fuel oil data per vessel)
- [ ] `RPT-002` EU MRV / THETIS-MRV report template
- [ ] `RPT-003` Annual CII report (flag state format)
- [ ] `RPT-004` ETS annual compliance report (competent authority format)
- [ ] `RPT-005` FuelEU compliance document
- [ ] `RPT-006` Charterer Scope 3 emission report
- [ ] `RPT-007` PDF generation service (report → PDF → S3 download link)
- [ ] `ANALYTICS-001` Fleet carbon trajectory forecast (current trend → 2030)
- [ ] `ANALYTICS-002` Cost forecasting model (ETS + FuelEU + offsets combined)
- [ ] `ANALYTICS-003` Vessel benchmarking vs fleet average
- [ ] `FRONT-RPT-001` Report generation page (select vessel/year/type)
- [ ] `FRONT-RPT-002` Report history table + download links
- [ ] `FRONT-ANALYTICS-001` Fleet analytics page with forecast charts

---

### Phase 8 — Polish & Launch (Week 8–10)

- [ ] `LAUNCH-001` AI compliance advisor (Claude API) — chat interface to answer regulatory questions
- [ ] `LAUNCH-002` Email notification system (deadline alerts, rating downgrades)
- [ ] `LAUNCH-003` Onboarding flow (import vessels from Mari8X or CSV)
- [ ] `LAUNCH-004` Billing integration (Stripe) with tier enforcement
- [ ] `LAUNCH-005` API key management (for programmatic access)
- [ ] `LAUNCH-006` White-label theming support
- [ ] `LAUNCH-007` Mobile-responsive UI audit
- [ ] `LAUNCH-008` Performance testing (fleet of 200+ vessels)
- [ ] `LAUNCH-009` Security audit (OWASP top 10)
- [ ] `LAUNCH-010` Deployment: Nginx config, PM2, domain `carbonx.ankr.in`
- [ ] `LAUNCH-011` Landing page at `carbonx.mari8x.com`
- [ ] `LAUNCH-012` Documentation site

---

## 12. File Structure

```
/root/apps/carbonx/
├── backend/
│   ├── src/
│   │   ├── main.ts                          # Fastify server init
│   │   ├── schema/
│   │   │   ├── builder.ts                   # Pothos builder
│   │   │   ├── context.ts                   # GraphQL context
│   │   │   ├── index.ts                     # Schema entry
│   │   │   └── types/
│   │   │       ├── cii.ts                   # CII types + resolvers
│   │   │       ├── ets.ts                   # EU ETS types + resolvers
│   │   │       ├── fueleu.ts                # FuelEU types + resolvers
│   │   │       ├── eexi.ts                  # EEXI types + resolvers
│   │   │       ├── voyage.ts                # Voyage + fuel data
│   │   │       ├── vessel.ts                # Vessel types
│   │   │       ├── carbon-credit.ts         # Carbon marketplace
│   │   │       ├── fleet-carbon.ts          # Fleet analytics
│   │   │       └── dcs-report.ts            # Report generation
│   │   ├── services/
│   │   │   ├── cii/
│   │   │   │   ├── cii-calculator.ts        # Pure CII math
│   │   │   │   └── cii-service.ts           # DB + business logic
│   │   │   ├── ets/
│   │   │   │   ├── ets-calculator.ts        # ETS obligation math
│   │   │   │   ├── ets-service.ts           # Account management
│   │   │   │   └── carbon-price.service.ts  # Price feed sync
│   │   │   ├── fueleu/
│   │   │   │   ├── ghg-calculator.ts        # Well-to-wake calcs
│   │   │   │   └── fueleu-service.ts        # Compliance logic
│   │   │   ├── eexi/
│   │   │   │   └── eexi-service.ts          # EEXI verification
│   │   │   ├── marketplace/
│   │   │   │   ├── verra.service.ts         # Verra API
│   │   │   │   ├── gold-standard.service.ts # GS API
│   │   │   │   └── credits-service.ts       # Portfolio management
│   │   │   └── reporting/
│   │   │       ├── dcs-report.service.ts    # IMO DCS
│   │   │       ├── mrv-report.service.ts    # EU MRV
│   │   │       └── pdf-generator.ts         # PDF export
│   │   ├── jobs/
│   │   │   ├── cii-daily-recalc.ts
│   │   │   ├── ets-price-sync.ts
│   │   │   ├── ets-surrender-alert.ts
│   │   │   ├── fueleu-compliance-check.ts
│   │   │   └── dcs-annual-report.ts
│   │   └── lib/
│   │       ├── prisma.ts                    # Prisma client singleton
│   │       ├── redis.ts                     # Redis client
│   │       └── queue.ts                     # BullMQ setup
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── CiiDashboard.tsx
│   │   │   ├── EtsDashboard.tsx
│   │   │   ├── FuelEuDashboard.tsx
│   │   │   ├── EexiDashboard.tsx
│   │   │   ├── CarbonCredits.tsx
│   │   │   ├── Analytics.tsx
│   │   │   └── Reports.tsx
│   │   ├── components/
│   │   │   ├── cii/
│   │   │   │   ├── CiiRatingBadge.tsx
│   │   │   │   ├── CiiTrendChart.tsx
│   │   │   │   ├── FleetCiiDistribution.tsx
│   │   │   │   └── CiiSimulator.tsx
│   │   │   ├── ets/
│   │   │   │   ├── EtsBalanceCard.tsx
│   │   │   │   ├── EuaPriceChart.tsx
│   │   │   │   ├── EtsObligationTable.tsx
│   │   │   │   └── SurrenderModal.tsx
│   │   │   ├── fueleu/
│   │   │   │   ├── GhgComplianceChart.tsx
│   │   │   │   ├── PenaltyForecastTable.tsx
│   │   │   │   └── FuelComparisonTool.tsx
│   │   │   └── shared/
│   │   │       ├── KpiCard.tsx
│   │   │       ├── RatingBadge.tsx
│   │   │       └── ComplianceStatusChip.tsx
│   │   ├── stores/
│   │   │   ├── auth.store.ts
│   │   │   ├── fleet.store.ts
│   │   │   └── ets.store.ts
│   │   └── lib/
│   │       ├── apollo.ts
│   │       └── gql/                         # Generated GQL types
│   └── package.json
│
├── docs/
│   ├── CII-FORMULA-REFERENCE.md
│   ├── EU-ETS-SCOPE-RULES.md
│   ├── FUELEU-FUEL-FACTORS.md
│   └── REGULATORY-CALENDAR.md
│
└── CARBONX-PROJECT-REPORT.md               # This file
```

---

## 13. Regulatory Reference Calendar

| Date | Regulation | Action Required |
|---|---|---|
| Jan 1 each year | CII | New reporting year begins |
| Jan 1 each year | FuelEU | New GHG intensity target year |
| Jan 31 each year | EU ETS | Verify voyage data completeness |
| 30 April each year | EU ETS | **Surrender EUAs for previous year** |
| Q1 each year | IMO DCS | Submit fuel consumption to flag state |
| Q2 each year | EU MRV | Submit verified MRV report to EU |
| Q3–Q4 | Planning | CII forecast + mitigation for next year |

---

## 14. KPIs & Success Metrics

| KPI | Target at Launch | Target at 6 months |
|---|---|---|
| Vessels onboarded | 50 | 500 |
| Organizations | 10 | 80 |
| MRR | $5,000 | $50,000 |
| CII calculations/day | 50 | 5,000 |
| Report generations/month | 100 | 2,000 |

---

*CarbonX — Built on the ANKR Maritime Stack | rocketlang/carbonx*
