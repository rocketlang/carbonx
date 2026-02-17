# CarbonX — Maritime Carbon Compliance Suite

> IMO CII · EU ETS · FuelEU Maritime · EEXI · Carbon Credits · Regulatory Reports

**CarbonX** gives shipowners, operators, and charterers a single command center for maritime carbon compliance — from real-time CII ratings to EU ETS allowance management, FuelEU GHG tracking, EEXI certification, and voluntary carbon offset trading.

---

## Feature Coverage

| Regulation | Scope | Status |
|---|---|---|
| **IMO CII** (MEPC.337/354) | Annual rating A–E, daily recalc, speed simulation | ✅ Live |
| **EU ETS** (2023/1805) | Obligation tracking, EUA management, surrender alerts | ✅ Live |
| **FuelEU Maritime** (EU 2023/1805) | WtW GHG intensity, penalty, pooling simulation | ✅ Live |
| **EEXI** (MEPC.333) | Attained/required EEXI, EPL/SHA calculation, certification | ✅ Live |
| **Carbon Credits** | Gold Standard, Verra VCS, retire/purchase workflow | ✅ Live |
| **Regulatory Reports** | EU MRV, IMO DCS, CII certificate, FuelEU, EEXI, Fleet Summary | ✅ Live |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│   React 19 + Vite + Apollo Client + Tailwind + Recharts      │
│   Port 3013                                                  │
└──────────────────────┬───────────────────────────────────────┘
                       │ GraphQL (HTTP)
┌──────────────────────▼───────────────────────────────────────┐
│                    Backend API                               │
│   Fastify 5 + Mercurius + Pothos (type-safe GraphQL)         │
│   Port 4053                                                  │
│                                                              │
│  Services:   CII · ETS · FuelEU · EEXI · Credits · Reports  │
│  Jobs:       CII daily recalc · EEXI monitor · ETS alerts    │
│  Auth:       JWT via @fastify/jwt (30-day tokens)            │
└───────┬───────────────────────────┬──────────────────────────┘
        │ Prisma 6                  │ BullMQ
┌───────▼──────────┐     ┌──────────▼──────────┐
│   PostgreSQL 16  │     │      Redis 7         │
│   (primary DB)   │     │  (job queue + cache) │
└──────────────────┘     └─────────────────────┘
```

---

## Quick Start (Development)

### Prerequisites
- Node.js 22+
- PostgreSQL 16
- Redis 7

### 1. Clone & install
```bash
git clone https://github.com/rocketlang/carbonx.git
cd carbonx

# Install both workspaces
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure environment
```bash
# backend/.env
cp backend/.env.example backend/.env
# Edit DATABASE_URL, REDIS_URL, JWT_SECRET
```

### 3. Database setup
```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
npm run db:seed
```

Seed creates:
- Organization: **ANKR Shipping Ltd**
- Admin user: `admin@carbonx.ankr.in` / `Admin1234!`
- 5 sample vessels (bulker, tanker, container, LNG carrier, general cargo)
- Voyages for 2024–2025 with realistic fuel data
- Pre-calculated CII records

### 4. Start services
```bash
# Terminal 1 — Backend API
cd backend && npm run dev
# → http://localhost:4053/graphql (GraphiQL available in dev)

# Terminal 2 — Frontend
cd frontend && npm run dev
# → http://localhost:3013
```

---

## Docker Compose (Production Preview)

```bash
# Build frontend
cd frontend && npm run build && cd ..

# Start full stack
JWT_SECRET=your-production-secret docker compose up --build -d

# Run migrations + seed
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run db:seed
```

Services:
- Frontend → http://localhost:3013
- Backend API → http://localhost:4053/graphql
- PostgreSQL → localhost:5432
- Redis → localhost:6379

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:password@localhost:5432/carbonx` | Postgres connection |
| `REDIS_URL` | `redis://localhost:6379` | Redis for BullMQ job queue |
| `JWT_SECRET` | `change-me-in-production` | JWT signing secret (change this!) |
| `PORT` | `4053` | API listen port |
| `HOST` | `0.0.0.0` | API bind address |
| `NODE_ENV` | `development` | `production` disables GraphiQL |
| `LOG_LEVEL` | `info` | Pino log level |
| `MARI8X_API_URL` | — | Optional: AIS/vessel data integration |
| `ANTHROPIC_API_KEY` | — | Optional: AI-powered compliance analysis |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:4053/graphql` | Backend GraphQL endpoint |

---

## Project Structure

```
carbonx/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # DB schema (Organization, User, Vessel, Voyage, ...)
│   │   └── seed.ts                # Dev seed data
│   └── src/
│       ├── lib/
│       │   ├── prisma.ts          # Prisma client singleton
│       │   ├── redis.ts           # Redis/BullMQ client
│       │   └── crypto.ts          # scrypt password hashing
│       ├── schema/
│       │   ├── builder.ts         # Pothos schema builder
│       │   ├── context.ts         # GraphQL context + JWT auth
│       │   ├── index.ts           # Schema assembly
│       │   └── types/
│       │       ├── auth.ts        # login, register, me, changePassword
│       │       ├── vessel.ts      # Vessel CRUD
│       │       ├── voyage.ts      # Voyage management
│       │       ├── cii.ts         # CII queries + simulation
│       │       ├── ets.ts         # EU ETS queries + EUA management
│       │       ├── fueleu.ts      # FuelEU compliance + simulation
│       │       ├── eexi.ts        # EEXI certification + simulation
│       │       ├── carbon-credit.ts # Credits portfolio + retirement
│       │       └── reports.ts     # Regulatory report generators
│       ├── services/
│       │   ├── cii/               # CII calculator + service
│       │   ├── ets/               # ETS calculator + price service
│       │   ├── fueleu/            # FuelEU calculator + service
│       │   ├── eexi/              # EEXI calculator + service
│       │   ├── credits/           # Carbon credits service
│       │   └── reports/           # Report generators
│       ├── jobs/                  # BullMQ background jobs
│       └── main.ts                # Fastify server entrypoint
│
└── frontend/
    └── src/
        ├── lib/
        │   ├── apollo.ts          # Apollo Client + auth link
        │   └── auth.ts            # Zustand auth store
        ├── pages/
        │   ├── LoginPage.tsx      # Auth: sign in / register
        │   ├── Dashboard.tsx      # Fleet overview
        │   ├── CiiDashboard.tsx   # CII ratings + simulator
        │   ├── EtsDashboard.tsx   # EU ETS obligations
        │   ├── FuelEuDashboard.tsx # FuelEU GHG compliance
        │   ├── EexiDashboard.tsx  # EEXI certification
        │   ├── CarbonCreditsDashboard.tsx # Credits portfolio
        │   ├── ReportsDashboard.tsx # Regulatory reports
        │   └── Settings.tsx       # Fleet management + profile
        └── components/
            ├── ErrorBoundary.tsx  # React error boundary
            ├── cii/               # CII-specific components
            ├── ets/               # ETS-specific components
            ├── fueleu/            # FuelEU-specific components
            ├── eexi/              # EEXI-specific components
            ├── credits/           # Credits-specific components
            └── reports/           # Report viewer + cards
```

---

## GraphQL API

GraphiQL explorer available at `http://localhost:4053/graphql` in development.

### Key Queries
```graphql
# Auth
query { me { id email name role organizationId } }

# Fleet
query { vessels { id imo name type dwt ciiRecords { rating } } }

# CII
query { fleetCiiStatus(year: 2025) { ... } }
query { simulateCii(vesselId: "...", year: 2025, targetRating: "B") { ... } }

# EU ETS
query { fleetEtsDashboard(year: 2025) { totalObligationMt shortfallEua estimatedCostEur } }

# FuelEU
query { fleetFuelEuDashboard(year: 2025) { fleetAvgGhgIntensity isFleetCompliant totalPenaltyEur } }
query { simulateFuelMix(vesselId: "...", year: 2025, fuelMix: [{fuelType: "lng", consumptionMt: 1000}]) { ... } }

# EEXI
query { fleetEexiStatus { certified compliant pending } }
query { simulateEexi(vesselType: "bulker", dwt: 76000, mcr: 12500, ...) { ... } }

# Carbon Credits
query { creditPortfolio { totalActiveCredits portfolioValueUsd } }
query { netOffsetPosition(year: 2025) { netPositionTco2 recommendation } }

# Reports
query { reportMrv(year: 2024) }
query { reportFleetSummary(year: 2024) }
```

### Key Mutations
```graphql
mutation { login(email: "...", password: "...") { token user { id name } } }
mutation { register(email: "...", name: "...", password: "...", orgName: "...", orgCode: "...") { token } }
mutation { createVessel(imo: "...", name: "...", type: "bulker", ...) { id } }
mutation { calculateCiiRecord(vesselId: "...", year: 2025) { rating ciiRatio } }
mutation { purchaseCarbonCredits(standard: "gold_standard", ...) { id quantity } }
mutation { retireCarbonCredits(creditId: "...", quantity: 100, retiredFor: "CII compliance 2025") { ... } }
```

---

## Background Jobs

| Job | Schedule | Description |
|---|---|---|
| CII Daily Recalc | Every 24h | Recalculate CII for all active vessels |
| CII Downgrade Monitor | Every 6h | Alert when vessel rating degrades |
| ETS Price Sync | Every 4h | Sync EU ETS carbon price feed |
| ETS Surrender Alert | Daily | Alert on approaching 30 April deadline |

---

## Regulatory Reference

| Module | Regulation | Key Formula |
|---|---|---|
| CII | MEPC.337(76) + 354(78) | Attained = CO₂(g) / (capacity × dist_nm) |
| EU ETS | Regulation (EU) 2003/87 + 2023/1805 | Phase-in: 40% (2024), 70% (2025), 100% (2026+) |
| FuelEU | Regulation (EU) 2023/1805 | Penalty = (GHG gap × Energy_MJ) / (91.16 × 40200) × €2,400 |
| EEXI | MEPC.333(76) Reg. 27 | Attained = CF × SFC × 0.75×MCR × fw / (capacity × Vref) |

---

## License

Proprietary — ANKR Labs © 2025. All rights reserved.
