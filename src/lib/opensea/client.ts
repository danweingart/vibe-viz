import {
  OPENSEA_API_BASE,
  COLLECTION_SLUG,
} from "@/lib/constants";
import type {
  OpenSeaCollectionStats,
  OpenSeaEvent,
  OpenSeaEventsResponse,
  OpenSeaListing,
  OpenSeaListingsResponse,
  OpenSeaOffer,
  OpenSeaOffersResponse,
} from "@/types/api";

const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY;

if (!OPENSEA_API_KEY) {
  console.warn("Warning: OPENSEA_API_KEY not set in environment variables");
}

async function fetchWithRetry<T>(
  url: string,
  options: RequestInit = {},
  retries = 5
): Promise<T> {
  const headers: HeadersInit = {
    Accept: "application/json",
    ...(OPENSEA_API_KEY && { "X-API-KEY": OPENSEA_API_KEY }),
    ...options.headers,
  };

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, { ...options, headers });

      if (response.status === 429) {
        // Rate limited - wait longer and retry
        const retryAfter = parseInt(response.headers.get("Retry-After") || "10");
        console.log(`Rate limited, waiting ${retryAfter}s before retry ${attempt + 1}/${retries}`);
        await new Promise((resolve) =>
          setTimeout(resolve, retryAfter * 1000)
        );
        continue;
      }

      if (!response.ok) {
        throw new Error(`OpenSea API error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      if (attempt === retries - 1) throw error;
      // Longer exponential backoff
      const delay = Math.pow(2, attempt + 1) * 1000;
      console.log(`Retry ${attempt + 1}/${retries} after ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("Max retries exceeded");
}

export async function getCollectionStats(): Promise<OpenSeaCollectionStats> {
  return fetchWithRetry<OpenSeaCollectionStats>(
    `${OPENSEA_API_BASE}/collections/${COLLECTION_SLUG}/stats`
  );
}

export async function getEvents(
  options: {
    eventType?: "sale" | "transfer" | "listing";
    limit?: number;
    next?: string;
    after?: number;
    before?: number;
  },
  collectionSlug: string = COLLECTION_SLUG
): Promise<OpenSeaEventsResponse> {
  const params = new URLSearchParams();

  if (options.eventType) params.set("event_type", options.eventType);
  if (options.limit) params.set("limit", String(options.limit));
  if (options.next) params.set("next", options.next);
  if (options.after) params.set("after", String(options.after));
  if (options.before) params.set("before", String(options.before));

  const url = `${OPENSEA_API_BASE}/events/collection/${collectionSlug}?${params}`;
  return fetchWithRetry<OpenSeaEventsResponse>(url);
}

export async function getAllSalesInRange(
  startTimestamp: number,
  endTimestamp: number
): Promise<OpenSeaEvent[]> {
  const allEvents: OpenSeaEvent[] = [];
  let next: string | null = null;

  do {
    const response = await getEvents({
      eventType: "sale",
      limit: 50,
      after: startTimestamp,
      before: endTimestamp,
      next: next || undefined,
    });

    allEvents.push(...response.asset_events);
    next = response.next;

    // Small delay to avoid rate limiting
    if (next) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  } while (next);

  return allEvents;
}

export function getPaymentToken(symbol?: string): "ETH" | "WETH" | "OTHER" {
  if (!symbol) return "OTHER";
  const upper = symbol.toUpperCase();
  if (upper === "ETH") return "ETH";
  if (upper === "WETH") return "WETH";
  return "OTHER";
}

export function parseEventPrice(event: OpenSeaEvent): number {
  if (!event.payment) return 0;

  const quantity = BigInt(event.payment.quantity);
  const decimals = event.payment.decimals;

  // Convert from wei to ETH
  return Number(quantity) / Math.pow(10, decimals);
}

// Fetch active listings for a collection
export async function getListings(
  collectionSlug: string = COLLECTION_SLUG,
  limit: number = 50
): Promise<OpenSeaListing[]> {
  const url = `${OPENSEA_API_BASE}/listings/collection/${collectionSlug}/all?limit=${limit}`;
  const response = await fetchWithRetry<OpenSeaListingsResponse>(url);
  return response.listings || [];
}

// Fetch best (lowest) listing for collection
export async function getBestListing(
  collectionSlug: string = COLLECTION_SLUG
): Promise<OpenSeaListing | null> {
  try {
    const url = `${OPENSEA_API_BASE}/listings/collection/${collectionSlug}/best`;
    const response = await fetchWithRetry<{ listings: OpenSeaListing[] }>(url);
    return response.listings?.[0] || null;
  } catch {
    return null;
  }
}

// Fetch collection offers
export async function getOffers(
  collectionSlug: string = COLLECTION_SLUG,
  limit: number = 50
): Promise<OpenSeaOffer[]> {
  const url = `${OPENSEA_API_BASE}/offers/collection/${collectionSlug}?limit=${limit}`;
  const response = await fetchWithRetry<OpenSeaOffersResponse>(url);
  return response.offers || [];
}

// Parse listing price from OpenSea format
export function parseListingPrice(listing: OpenSeaListing): number {
  if (!listing.price?.current) return 0;
  const value = BigInt(listing.price.current.value);
  const decimals = listing.price.current.decimals;
  return Number(value) / Math.pow(10, decimals);
}

// Parse offer price from OpenSea format
export function parseOfferPrice(offer: OpenSeaOffer): number {
  if (!offer.price) return 0;
  const value = BigInt(offer.price.value);
  const decimals = offer.price.decimals;
  return Number(value) / Math.pow(10, decimals);
}
