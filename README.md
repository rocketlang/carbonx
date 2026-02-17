# CarbonX — Maritime Carbon Compliance & Trading Platform

> IMO CII · EU ETS · FuelEU Maritime · EEXI · Carbon Credits

**CarbonX** gives shipowners, operators, and charterers a single command center for maritime carbon compliance — from real-time CII ratings to EU ETS allowance management and voluntary carbon offset trading.

## Why CarbonX?

| Regulation | Status | CarbonX Coverage |
|---|---|---|
| IMO CII (A–E rating) | Mandatory since 2023 | Full calculation + alerts |
| EU ETS (carbon tax) | Live since Jan 2024 | Allowance tracking + purchasing |
| FuelEU Maritime | Live since Jan 2025 | GHG intensity + penalty calc |
| EEXI certification | Mandatory since 2023 | Compliance verification |
| IMO DCS reporting | Rolling | Automated report generation |

## Stack

- **Backend:** Fastify 5 + Pothos + Prisma 6 + GraphQL (Port 4052)
- **Frontend:** React 19 + Vite + Apollo Client + Tailwind (Port 3009)
- **Database:** PostgreSQL (`carbonx`)
- **Jobs:** BullMQ + Redis

## Quick Start

```bash
# Backend
cd backend && npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev

# Frontend
cd frontend && npm install
npm run dev
```

## Project Report

See [CARBONX-PROJECT-REPORT.md](./CARBONX-PROJECT-REPORT.md) for full architecture, module breakdown, and complete TODO list.

## Part of the ANKR Maritime Stack

```
Mari8X (vessel tracking + AIS)
    └─→ CarbonX (carbon compliance)
            └─→ FreightBox (charter party carbon clauses)
```

---

*Built by [ANKR Labs](https://ankr.in) · Part of the [rocketlang](https://github.com/rocketlang) ecosystem*
