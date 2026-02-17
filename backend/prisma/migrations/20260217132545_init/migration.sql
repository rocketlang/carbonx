-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'shipowner',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'operator',
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vessels" (
    "id" TEXT NOT NULL,
    "imo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "flag" TEXT NOT NULL,
    "dwt" DOUBLE PRECISION NOT NULL,
    "gt" DOUBLE PRECISION NOT NULL,
    "yearBuilt" INTEGER NOT NULL,
    "enginePowerKw" DOUBLE PRECISION,
    "organizationId" TEXT NOT NULL,
    "mari8xVesselId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vessels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voyages" (
    "id" TEXT NOT NULL,
    "vesselId" TEXT NOT NULL,
    "voyageNumber" TEXT NOT NULL,
    "departurePort" TEXT NOT NULL,
    "arrivalPort" TEXT NOT NULL,
    "departurePortCountry" TEXT NOT NULL DEFAULT '',
    "arrivalPortCountry" TEXT NOT NULL DEFAULT '',
    "departureAt" TIMESTAMP(3) NOT NULL,
    "arrivalAt" TIMESTAMP(3),
    "distanceNm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hfoConsumedMt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mgoConsumedMt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lngConsumedMt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "methanolConsumedMt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "biofuelConsumedMt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "co2EmissionsMt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ghgIntensity" DOUBLE PRECISION,
    "etsScope" TEXT NOT NULL DEFAULT 'none',
    "etsCo2Applicable" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voyages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cii_records" (
    "id" TEXT NOT NULL,
    "vesselId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "totalDistanceNm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCo2G" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dwt" DOUBLE PRECISION NOT NULL,
    "attainedCii" DOUBLE PRECISION,
    "requiredCii" DOUBLE PRECISION,
    "ciiRatio" DOUBLE PRECISION,
    "rating" TEXT,
    "iceCorrectionApplied" BOOLEAN NOT NULL DEFAULT false,
    "shuttleCorrectionApplied" BOOLEAN NOT NULL DEFAULT false,
    "yearEndProjection" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cii_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ets_accounts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accountNumber" TEXT,
    "euaBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ets_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ets_records" (
    "id" TEXT NOT NULL,
    "vesselId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "totalCo2Mt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "applicablePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "obligationMt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "euaSurrendered" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "surrenderDeadline" TIMESTAMP(3),
    "isSettled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ets_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ets_transactions" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "euaAmount" DOUBLE PRECISION NOT NULL,
    "priceEur" DOUBLE PRECISION,
    "totalEur" DOUBLE PRECISION,
    "notes" TEXT,
    "transactedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ets_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fueleu_records" (
    "id" TEXT NOT NULL,
    "vesselId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "actualGhgIntensity" DOUBLE PRECISION,
    "targetGhgIntensity" DOUBLE PRECISION,
    "ghgGap" DOUBLE PRECISION,
    "totalEnergyMj" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isCompliant" BOOLEAN NOT NULL DEFAULT false,
    "penaltyEur" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "poolSurplusMj" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "poolBorrowedMj" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fueleu_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eexi_records" (
    "id" TEXT NOT NULL,
    "vesselId" TEXT NOT NULL,
    "attainedEexi" DOUBLE PRECISION,
    "requiredEexi" DOUBLE PRECISION,
    "isCompliant" BOOLEAN NOT NULL DEFAULT false,
    "enginePowerLimitKw" DOUBLE PRECISION,
    "shaPowerLimitKw" DOUBLE PRECISION,
    "certificateNumber" TEXT,
    "certifiedAt" TIMESTAMP(3),
    "certifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eexi_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carbon_credits" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "standard" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "projectType" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "vintage" INTEGER NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "priceUsd" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'active',
    "retiredAt" TIMESTAMP(3),
    "retiredFor" TEXT,
    "registryUrl" TEXT,
    "serialNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carbon_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carbon_price_feed" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priceEur" DOUBLE PRECISION NOT NULL,
    "priceUsd" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "carbon_price_feed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_code_key" ON "organizations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "vessels_imo_key" ON "vessels"("imo");

-- CreateIndex
CREATE INDEX "vessels_organizationId_idx" ON "vessels"("organizationId");

-- CreateIndex
CREATE INDEX "voyages_vesselId_idx" ON "voyages"("vesselId");

-- CreateIndex
CREATE INDEX "voyages_etsScope_idx" ON "voyages"("etsScope");

-- CreateIndex
CREATE INDEX "voyages_status_idx" ON "voyages"("status");

-- CreateIndex
CREATE INDEX "cii_records_vesselId_idx" ON "cii_records"("vesselId");

-- CreateIndex
CREATE UNIQUE INDEX "cii_records_vesselId_year_key" ON "cii_records"("vesselId", "year");

-- CreateIndex
CREATE INDEX "ets_accounts_organizationId_idx" ON "ets_accounts"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ets_records_vesselId_year_key" ON "ets_records"("vesselId", "year");

-- CreateIndex
CREATE INDEX "ets_transactions_accountId_idx" ON "ets_transactions"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "fueleu_records_vesselId_year_key" ON "fueleu_records"("vesselId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "eexi_records_vesselId_key" ON "eexi_records"("vesselId");

-- CreateIndex
CREATE INDEX "carbon_credits_organizationId_idx" ON "carbon_credits"("organizationId");

-- CreateIndex
CREATE INDEX "carbon_price_feed_type_recordedAt_idx" ON "carbon_price_feed"("type", "recordedAt");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vessels" ADD CONSTRAINT "vessels_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voyages" ADD CONSTRAINT "voyages_vesselId_fkey" FOREIGN KEY ("vesselId") REFERENCES "vessels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cii_records" ADD CONSTRAINT "cii_records_vesselId_fkey" FOREIGN KEY ("vesselId") REFERENCES "vessels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ets_accounts" ADD CONSTRAINT "ets_accounts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ets_records" ADD CONSTRAINT "ets_records_vesselId_fkey" FOREIGN KEY ("vesselId") REFERENCES "vessels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ets_records" ADD CONSTRAINT "ets_records_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ets_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ets_transactions" ADD CONSTRAINT "ets_transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ets_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fueleu_records" ADD CONSTRAINT "fueleu_records_vesselId_fkey" FOREIGN KEY ("vesselId") REFERENCES "vessels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eexi_records" ADD CONSTRAINT "eexi_records_vesselId_fkey" FOREIGN KEY ("vesselId") REFERENCES "vessels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_credits" ADD CONSTRAINT "carbon_credits_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
