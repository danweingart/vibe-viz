/**
 * Etherscan Data Transformer
 *
 * Transforms raw Etherscan transfer data into frontend data contracts.
 * Enriches transfers with OpenSea price data to maintain accuracy while
 * using Etherscan as the source of truth for on-chain transactions.
 */

import type { EtherscanTransfer } from "./client";
import type {
  SaleRecord,
  DailyStats,
  CollectionStats,
} from "@/types/api";
import { getEvents, parseEventPrice, getPaymentToken } from "@/lib/opensea/client";
import { getPriceCache, setPriceCache } from "@/lib/cache/prices";

/**
 * Enriched transfer with price data from OpenSea
 */
interface EnrichedTransfer extends EtherscanTransfer {
  priceEth?: number;
  priceUsd?: number;
  paymentToken?: "ETH" | "WETH" | "OTHER";
  paymentSymbol?: string;
  protocol?: string;
  imageUrl?: string;
}

/**
 * Enrich Etherscan transfers with price data from OpenSea
 *
 * Strategy: Look up each transfer by txHash in OpenSea to get marketplace price.
 * This gives us complete on-chain data (Etherscan) + accurate prices (OpenSea).
 *
 * @param transfers - Raw transfers from Etherscan
 * @param ethPriceUsd - Current ETH/USD price for USD conversion
 * @param collectionSlug - OpenSea collection slug for fetching events
 * @returns Transfers with price data attached
 */
export async function enrichTransfersWithPrices(
  transfers: EtherscanTransfer[],
  ethPriceUsd: number,
  collectionSlug?: string
): Promise<EnrichedTransfer[]> {
  const enriched: EnrichedTransfer[] = [];
  const txHashesToFetch: string[] = [];

  // Check cache first
  for (const transfer of transfers) {
    const cached = getPriceCache(transfer.hash);
    if (cached) {
      enriched.push({
        ...transfer,
        priceEth: cached.priceEth,
        priceUsd: cached.priceEth * ethPriceUsd,
        paymentToken: cached.paymentToken,
        paymentSymbol: cached.paymentSymbol,
        protocol: cached.protocol,
        imageUrl: cached.imageUrl,
      });
    } else {
      txHashesToFetch.push(transfer.hash);
      enriched.push({ ...transfer }); // Add without price for now
    }
  }

  if (txHashesToFetch.length === 0) {
    return enriched;
  }

  console.log(`Enriching ${txHashesToFetch.length} transfers with OpenSea prices...`);

  // Fetch OpenSea events for uncached transactions
  // We'll fetch sales from the time range of these transfers
  const timestamps = transfers.map(t => parseInt(t.timeStamp));
  const minTime = Math.min(...timestamps);
  const maxTime = Math.max(...timestamps);

  try {
    // Fetch ALL OpenSea sales in this time range with pagination
    const allOpenSeaEvents: any[] = [];
    let nextCursor: string | null = null;
    let page = 0;
    const maxPages = 250; // Increased limit for complete historical data (250 pages × 200 events = 50k max)

    do {
      const openSeaResponse = await getEvents({
        eventType: "sale",
        after: minTime,
        before: maxTime,
        limit: 200, // Max per request
        next: nextCursor || undefined,
      }, collectionSlug);

      if (openSeaResponse.asset_events && openSeaResponse.asset_events.length > 0) {
        allOpenSeaEvents.push(...openSeaResponse.asset_events);
      }

      nextCursor = openSeaResponse.next || null;
      page++;

      // Break if we've fetched enough events or hit the safety limit
      if (!nextCursor || page >= maxPages || allOpenSeaEvents.length >= txHashesToFetch.length * 2) {
        break;
      }

      // Small delay between pagination requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 150));
    } while (nextCursor);

    console.log(`Fetched ${allOpenSeaEvents.length} OpenSea events across ${page} pages`);

    // Build txHash -> OpenSea event map
    const eventsByTxHash = new Map(
      allOpenSeaEvents
        .filter(event => event.transaction)
        .map(event => [event.transaction!.toLowerCase(), event] as const)
    );

    console.log(`Built map with ${eventsByTxHash.size} unique transaction hashes from OpenSea`);

    // Enrich transfers with OpenSea price data
    let matched = 0;
    let missingPayment = 0;

    for (let i = 0; i < enriched.length; i++) {
      const transfer = enriched[i];
      const txHash = transfer.hash.toLowerCase();

      if (txHashesToFetch.includes(transfer.hash)) {
        const openSeaEvent = eventsByTxHash.get(txHash);

        if (openSeaEvent) {
          if (openSeaEvent.payment) {
            const priceEth = parseEventPrice(openSeaEvent);
            const paymentToken = getPaymentToken(openSeaEvent.payment.symbol);
            const paymentSymbol = openSeaEvent.payment.symbol || "UNKNOWN";
            const protocol = openSeaEvent.protocol_address || "unknown";
            const imageUrl = openSeaEvent.nft?.image_url || "";

            enriched[i] = {
              ...transfer,
              priceEth,
              priceUsd: priceEth * ethPriceUsd,
              paymentToken,
              paymentSymbol,
              protocol,
              imageUrl,
            };

            // Cache for future lookups
            setPriceCache(transfer.hash, {
              priceEth,
              paymentToken,
              paymentSymbol,
              protocol,
              imageUrl,
            });

            matched++;
          } else {
            missingPayment++;
          }
        }
      }
    }

    console.log(`Matched ${matched} transfers with OpenSea events, ${missingPayment} events had no payment data`);
  } catch (error) {
    console.error("Failed to enrich transfers with OpenSea prices:", error);
    // Continue without prices rather than failing completely
  }

  const enrichedCount = enriched.filter(t => t.priceEth !== undefined).length;
  console.log(`Enriched ${enrichedCount}/${transfers.length} transfers (${((enrichedCount / transfers.length) * 100).toFixed(1)}% coverage)`);

  return enriched;
}

/**
 * Transform enriched transfers into SaleRecord array (frontend contract)
 *
 * @param transfers - Enriched transfers with price data
 * @returns Array of SaleRecord objects for frontend
 */
export function transformToSaleRecords(
  transfers: EnrichedTransfer[]
): SaleRecord[] {
  return transfers
    .filter(t => t.priceEth !== undefined) // Only include sales with known prices
    .map(transfer => ({
      id: transfer.hash,
      tokenId: transfer.tokenID,
      tokenName: transfer.tokenName || `#${transfer.tokenID}`,
      imageUrl: transfer.imageUrl || "", // Extracted from OpenSea event during enrichment
      priceEth: transfer.priceEth!,
      priceUsd: transfer.priceUsd || 0,
      paymentToken: transfer.paymentToken || "OTHER",
      paymentSymbol: transfer.paymentSymbol || "UNKNOWN",
      seller: transfer.from,
      buyer: transfer.to,
      timestamp: new Date(parseInt(transfer.timeStamp) * 1000),
      txHash: transfer.hash,
    }));
}

/**
 * Aggregate sales into daily statistics (frontend contract)
 *
 * @param saleRecords - Array of sale records
 * @param floorPrice - Current or historical floor price for premium calculations
 * @returns Array of DailyStats for each day in the dataset
 */
export function aggregateDailyStats(
  saleRecords: SaleRecord[],
  floorPrice: number
): DailyStats[] {
  // Group sales by date
  const salesByDate = new Map<string, SaleRecord[]>();

  for (const sale of saleRecords) {
    const dateKey = sale.timestamp.toISOString().split("T")[0];
    if (!salesByDate.has(dateKey)) {
      salesByDate.set(dateKey, []);
    }
    salesByDate.get(dateKey)!.push(sale);
  }

  // Calculate stats for each day
  const dailyStats: DailyStats[] = [];

  for (const [date, sales] of Array.from(salesByDate.entries())) {
    const prices = sales.map(s => s.priceEth);
    const volume = prices.reduce((sum, p) => sum + p, 0);
    const avgPrice = volume / sales.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    // Premium tier calculations (relative to floor)
    const salesAbove10Pct = sales.filter(s => s.priceEth >= floorPrice * 1.1).length;
    const salesAbove25Pct = sales.filter(s => s.priceEth >= floorPrice * 1.25).length;
    const salesAbove50Pct = sales.filter(s => s.priceEth >= floorPrice * 1.5).length;

    // Payment breakdown (counts)
    const ethPayments = sales.filter(s => s.paymentToken === "ETH").length;
    const wethPayments = sales.filter(s => s.paymentToken === "WETH").length;
    const otherPayments = sales.filter(s => s.paymentToken === "OTHER").length;

    // Payment volume breakdown (actual ETH amounts)
    const ethVolume = sales.filter(s => s.paymentToken === "ETH").reduce((sum, s) => sum + s.priceEth, 0);
    const wethVolume = sales.filter(s => s.paymentToken === "WETH").reduce((sum, s) => sum + s.priceEth, 0);
    const otherVolume = sales.filter(s => s.paymentToken === "OTHER").reduce((sum, s) => sum + s.priceEth, 0);

    // Get average ETH price for this day (from sale USD prices)
    const ethPrice = sales.length > 0 ? sales[0].priceUsd / sales[0].priceEth : 0;

    dailyStats.push({
      date,
      volume,
      volumeUsd: volume * ethPrice,
      salesCount: sales.length,
      avgPrice,
      minPrice,
      maxPrice,
      ethPrice,
      salesAbove10Pct,
      salesAbove25Pct,
      salesAbove50Pct,
      ethPayments,
      wethPayments,
      otherPayments,
      ethVolume,
      wethVolume,
      otherVolume,
      salePrices: sales.map(s => ({ eth: s.priceEth, usd: s.priceUsd })),
    });
  }

  // Sort by date (oldest first)
  return dailyStats.sort((a, b) => a.date.localeCompare(b.date));
}

// Re-export for easier consumption
export { aggregateDailyStats as default };

/**
 * Calculate floor price from recent sales
 *
 * Uses the lowest sale price in the last 7 days as a floor proxy.
 * This is less accurate than OpenSea's real-time floor (from active listings),
 * but provides a historical floor estimate from on-chain data.
 *
 * @param saleRecords - Recent sale records (ideally last 7-30 days)
 * @returns Estimated floor price in ETH
 */
export function calculateFloorPrice(saleRecords: SaleRecord[]): number {
  if (saleRecords.length === 0) return 0;

  // Get sales from last 7 days
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentSales = saleRecords.filter(s => s.timestamp.getTime() >= sevenDaysAgo);

  if (recentSales.length === 0) {
    // Fallback to all sales if no recent ones
    return Math.min(...saleRecords.map(s => s.priceEth));
  }

  // Use bottom 10th percentile as floor to avoid outliers
  const sortedPrices = recentSales.map(s => s.priceEth).sort((a, b) => a - b);
  const floorIndex = Math.floor(sortedPrices.length * 0.1);
  return sortedPrices[floorIndex] || sortedPrices[0];
}

/**
 * Build complete CollectionStats from Etherscan data + hybrid OpenSea floor
 *
 * @param saleRecords - All sales in the period (typically 365 days)
 * @param totalSupply - Total token supply from Etherscan
 * @param holderCount - Unique holder count from Etherscan
 * @param floorPriceFromOpenSea - Live floor price from OpenSea (most accurate)
 * @param ethPriceUsd - Current ETH/USD for conversions
 * @returns Complete CollectionStats object
 */
export function buildCollectionStats(
  saleRecords: SaleRecord[],
  totalSupply: number,
  holderCount: number,
  floorPriceFromOpenSea: number,
  ethPriceUsd: number
): CollectionStats {
  // Total volume and sales (all time or 365 days)
  const totalVolume = saleRecords.reduce((sum, s) => sum + s.priceEth, 0);
  const totalSales = saleRecords.length;
  const avgPrice = totalSales > 0 ? totalVolume / totalSales : 0;

  // Market cap = floor × supply
  const marketCap = floorPriceFromOpenSea * totalSupply;

  // 24h stats
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const twoDaysAgo = Date.now() - 48 * 60 * 60 * 1000;

  const sales24h = saleRecords.filter(s => s.timestamp.getTime() >= oneDayAgo);
  const salesPrev24h = saleRecords.filter(s =>
    s.timestamp.getTime() >= twoDaysAgo && s.timestamp.getTime() < oneDayAgo
  );

  const volume24h = sales24h.reduce((sum, s) => sum + s.priceEth, 0);
  const volumePrev24h = salesPrev24h.reduce((sum, s) => sum + s.priceEth, 0);

  const volume24hChange = volumePrev24h > 0
    ? ((volume24h - volumePrev24h) / volumePrev24h) * 100
    : 0;

  return {
    floorPrice: floorPriceFromOpenSea,
    floorPriceUsd: floorPriceFromOpenSea * ethPriceUsd,
    totalVolume,
    totalVolumeUsd: totalVolume * ethPriceUsd,
    totalSales,
    numOwners: holderCount,
    marketCap,
    marketCapUsd: marketCap * ethPriceUsd,
    avgPrice,
    avgPriceUsd: avgPrice * ethPriceUsd,
    volume24h,
    volume24hUsd: volume24h * ethPriceUsd,
    volume24hChange,
    sales24h: sales24h.length,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Calculate unique buyers and sellers from sale records
 *
 * @param saleRecords - Sales to analyze
 * @returns Object with unique buyer/seller counts
 */
export function calculateTraderCounts(saleRecords: SaleRecord[]): {
  uniqueBuyers: number;
  uniqueSellers: number;
  buyers: Set<string>;
  sellers: Set<string>;
} {
  const buyers = new Set<string>();
  const sellers = new Set<string>();

  for (const sale of saleRecords) {
    buyers.add(sale.buyer.toLowerCase());
    sellers.add(sale.seller.toLowerCase());
  }

  return {
    uniqueBuyers: buyers.size,
    uniqueSellers: sellers.size,
    buyers,
    sellers,
  };
}

/**
 * Detect flips (same tokenId resold) from sale records
 *
 * @param saleRecords - Sales sorted by timestamp (oldest first)
 * @returns Array of flip records with profit calculations
 */
export function detectFlips(saleRecords: SaleRecord[]): {
  tokenId: string;
  buyPrice: number;
  sellPrice: number;
  profit: number;
  profitPercent: number;
  holdingDays: number;
  buyer: string;
}[] {
  const flips: {
    tokenId: string;
    buyPrice: number;
    sellPrice: number;
    profit: number;
    profitPercent: number;
    holdingDays: number;
    buyer: string;
  }[] = [];

  // Sort by timestamp (oldest first)
  const sorted = [...saleRecords].sort((a, b) =>
    a.timestamp.getTime() - b.timestamp.getTime()
  );

  // Track last sale for each tokenId
  const lastSales = new Map<string, SaleRecord>();

  for (const sale of sorted) {
    const previous = lastSales.get(sale.tokenId);

    if (previous) {
      // This is a resale - calculate flip profit
      const holdingMs = sale.timestamp.getTime() - previous.timestamp.getTime();
      const holdingDays = holdingMs / (1000 * 60 * 60 * 24);
      const profit = sale.priceEth - previous.priceEth;
      const profitPercent = (profit / previous.priceEth) * 100;

      flips.push({
        tokenId: sale.tokenId,
        buyPrice: previous.priceEth,
        sellPrice: sale.priceEth,
        profit,
        profitPercent,
        holdingDays,
        buyer: previous.buyer,
      });
    }

    lastSales.set(sale.tokenId, sale);
  }

  return flips;
}
