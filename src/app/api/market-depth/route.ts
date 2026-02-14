import { NextResponse } from "next/server";
import { getListings, getCollectionOffers, parseListingPrice } from "@/lib/opensea/client";
import { cache } from "@/lib/cache/postgres";
import { COLLECTION_SLUG } from "@/lib/constants";
import type { MarketDepth, OpenSeaOffer } from "@/types/api";

export const dynamic = "force-dynamic";

// Parse offer: price.value is TOTAL value (price * quantity), so divide to get per-NFT price
function parseOfferWithQuantity(offer: OpenSeaOffer): { pricePerNft: number; quantity: number } {
  if (!offer.price) return { pricePerNft: 0, quantity: 0 };
  const totalValue = BigInt(offer.price.value);
  const decimals = offer.price.decimals;
  const totalEth = Number(totalValue) / Math.pow(10, decimals);
  const quantity = offer.remaining_quantity || 1;
  const pricePerNft = totalEth / quantity;
  return { pricePerNft, quantity };
}

// Round price to bucket (0.01 ETH increments)
function priceToBucket(price: number): number {
  return Math.floor(price * 100) / 100;
}

export async function GET() {
  try {
    const cacheKey = `market-depth-${COLLECTION_SLUG}`;
    const cached = await cache.get<MarketDepth>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Fetch listings and offers in parallel
    const [listings, offers] = await Promise.all([
      getListings(COLLECTION_SLUG, 100),
      getCollectionOffers(COLLECTION_SLUG, 200),
    ]);

    // Parse listing prices - each listing is for 1 NFT
    const listingPrices = listings
      .map(parseListingPrice)
      .filter((p) => p > 0)
      .sort((a, b) => a - b);

    // Aggregate listings by price bucket
    const listingBuckets = new Map<number, number>();
    for (const price of listingPrices) {
      const bucket = priceToBucket(price);
      listingBuckets.set(bucket, (listingBuckets.get(bucket) || 0) + 1);
    }

    // Parse offers and aggregate by per-NFT price bucket, summing remaining_quantity
    const offerBuckets = new Map<number, number>();
    for (const offer of offers) {
      const { pricePerNft, quantity } = parseOfferWithQuantity(offer);
      if (pricePerNft > 0 && quantity > 0) {
        const bucket = priceToBucket(pricePerNft);
        offerBuckets.set(bucket, (offerBuckets.get(bucket) || 0) + quantity);
      }
    }

    // Convert to sorted arrays
    const listingDepth = Array.from(listingBuckets.entries())
      .map(([price, depth]) => ({ price, depth }))
      .sort((a, b) => a.price - b.price);

    const offerDepth = Array.from(offerBuckets.entries())
      .map(([price, depth]) => ({ price, depth }))
      .sort((a, b) => b.price - a.price); // Descending for offers

    // Calculate totals
    const totalListingDepth = listingDepth.reduce((sum, b) => sum + b.depth, 0);
    const totalOfferDepth = offerDepth.reduce((sum, b) => sum + b.depth, 0);

    // Calculate spread
    const lowestListing = listingPrices[0] || 0;
    const highestOffer = offerDepth.length > 0 ? offerDepth[0].price : 0;
    const spread = lowestListing - highestOffer;
    const spreadPercent = highestOffer > 0 ? (spread / highestOffer) * 100 : 0;

    const marketDepth: MarketDepth = {
      listings: listingDepth,
      offers: offerDepth,
      spread: Math.round(spread * 1000) / 1000,
      spreadPercent: Math.round(spreadPercent * 10) / 10,
      lowestListing,
      highestOffer,
      totalListingDepth,
      totalOfferDepth,
      lastUpdated: new Date().toISOString(),
    };

    // Cache for 2 minutes
    await cache.set(cacheKey, marketDepth, 120);

    return NextResponse.json(marketDepth);
  } catch (error) {
    console.error("Error fetching market depth:", error);
    return NextResponse.json(
      { error: "Failed to fetch market depth" },
      { status: 500 }
    );
  }
}
