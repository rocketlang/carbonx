/**
 * Carbon Price Service
 * Manages EUA (EU Allowance) price feeds.
 *
 * Sources (configure via env):
 * - ICE Futures Europe API (requires ICE_CARBON_API_KEY)
 * - EEX Power Derivatives (requires EEX_CARBON_API_KEY)
 * - Fallback: manual price entry via GraphQL mutation
 *
 * Default fallback price: €65/tonne (realistic 2025 range: €50–€75)
 */

import type { PrismaClient } from '../../../generated/prisma/index.js';
import { logger } from '../../utils/logger.js';

const DEFAULT_EUA_PRICE_EUR = 65.00;
const DEFAULT_VCU_PRICE_USD  = 12.50;

interface PriceFetchResult {
  priceEur: number;
  source: string;
}

class CarbonPriceService {
  /**
   * Get the most recent EUA price.
   * Returns DEFAULT_EUA_PRICE_EUR if no price is stored.
   */
  async getLatestEuaPrice(prisma: PrismaClient): Promise<number> {
    const latest = await prisma.carbonPriceFeed.findFirst({
      where: { type: 'eu_ets' },
      orderBy: { recordedAt: 'desc' },
    });
    return latest?.priceEur ?? DEFAULT_EUA_PRICE_EUR;
  }

  /**
   * Get price history for charting (last N days).
   */
  async getPriceHistory(
    prisma: PrismaClient,
    type: 'eu_ets' | 'voluntary_vcs' | 'voluntary_gs',
    days: number = 90,
  ) {
    const since = new Date(Date.now() - days * 86_400_000);
    return prisma.carbonPriceFeed.findMany({
      where: { type, recordedAt: { gte: since } },
      orderBy: { recordedAt: 'asc' },
      select: { priceEur: true, priceUsd: true, source: true, recordedAt: true },
    });
  }

  /**
   * Fetch latest EUA price from external API.
   * Falls back gracefully if API keys are not set.
   */
  async fetchAndStoreLatestPrice(prisma: PrismaClient): Promise<PriceFetchResult> {
    // Try ICE Carbon API
    if (process.env.ICE_CARBON_API_KEY) {
      try {
        const result = await this.fetchFromIce();
        await this.storePrice(prisma, 'eu_ets', result.priceEur, result.source);
        return result;
      } catch (err) {
        logger.warn({ err }, 'ICE Carbon API failed — trying EEX');
      }
    }

    // Try EEX API
    if (process.env.EEX_CARBON_API_KEY) {
      try {
        const result = await this.fetchFromEex();
        await this.storePrice(prisma, 'eu_ets', result.priceEur, result.source);
        return result;
      } catch (err) {
        logger.warn({ err }, 'EEX Carbon API failed — using simulated price');
      }
    }

    // No API key configured — use simulated realistic price
    const simulated = this.simulateEuaPrice();
    await this.storePrice(prisma, 'eu_ets', simulated.priceEur, simulated.source);
    logger.debug({ price: simulated.priceEur }, 'Using simulated EUA price');
    return simulated;
  }

  /**
   * Simulate a realistic EUA price with slight daily variation.
   * Replace this with a real API call when ICE_CARBON_API_KEY is set.
   */
  private simulateEuaPrice(): PriceFetchResult {
    // Base around €65 with ±5% daily random walk
    const base = 65.0;
    const noise = (Math.random() - 0.5) * 6; // ±3 EUR
    const priceEur = Math.max(45, Math.min(90, base + noise));
    return { priceEur: Math.round(priceEur * 100) / 100, source: 'simulated' };
  }

  /** ICE Futures Europe API integration (stub — requires API key) */
  private async fetchFromIce(): Promise<PriceFetchResult> {
    const res = await fetch(
      'https://api.ice.com/carbon/eua/spot', // placeholder URL
      { headers: { Authorization: `Bearer ${process.env.ICE_CARBON_API_KEY}` } },
    );
    if (!res.ok) throw new Error(`ICE API ${res.status}`);
    const data = await res.json() as { price: number; currency: string };
    return { priceEur: data.price, source: 'ice' };
  }

  /** EEX API integration (stub — requires API key) */
  private async fetchFromEex(): Promise<PriceFetchResult> {
    const res = await fetch(
      'https://api.eex.com/carbon/spot',
      { headers: { 'X-API-Key': process.env.EEX_CARBON_API_KEY ?? '' } },
    );
    if (!res.ok) throw new Error(`EEX API ${res.status}`);
    const data = await res.json() as { price: number };
    return { priceEur: data.price, source: 'eex' };
  }

  private async storePrice(
    prisma: PrismaClient,
    type: string,
    priceEur: number,
    source: string,
  ) {
    const usdRate = 1.08; // approximate EUR/USD
    await prisma.carbonPriceFeed.create({
      data: { type, priceEur, priceUsd: priceEur * usdRate, source },
    });
  }

  /** Manual override — admin sets the price directly */
  async setManualPrice(
    prisma: PrismaClient,
    type: 'eu_ets' | 'voluntary_vcs',
    priceEur: number,
  ) {
    return this.storePrice(prisma, type, priceEur, 'manual');
  }
}

export const carbonPriceService = new CarbonPriceService();
