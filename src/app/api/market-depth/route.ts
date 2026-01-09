import { NextResponse } from "next/server";
import { getListings, getOffers, parseListingPrice, parseOfferPrice } from "@/lib/opensea/client";
import { getEthPrice } from "@/lib/coingecko/client";
import { cache } from "@/lib/cache/memory";
import { COLLECTION_SLUG } from "@/lib/constants";
import type { MarketDepth } from "@/types/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cacheKey = `market-depth-${COLLECTION_SLUG}`;
    const cached = await cache.get<MarketDepth>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Fetch listings and offers in parallel
    const [listings, offers, ethPriceData] = await Promise.all([
      getListings(COLLECTION_SLUG, 100),
      getOffers(COLLECTION_SLUG, 50),
      getEthPrice(),
    ]);

    // Parse listing prices and sort
    const listingPrices = listings
      .map(parseListingPrice)
      .filter((p) => p > 0)
      .sort((a, b) => a - b);

    // Parse offer prices and sort descending
    const offerPrices = offers
      .map(parseOfferPrice)
      .filter((p) => p > 0)
      .sort((a, b) => b - a);

    // Bucket listings into price ranges for depth chart
    const listingBuckets: { price: number; count: number }[] = [];
    if (listingPrices.length > 0) {
      const minListing = listingPrices[0];
      const maxListing = listingPrices[listingPrices.length - 1];
      const range = maxListing - minListing;
      const bucketSize = range > 0 ? range / 10 : 0.1;

      for (let i = 0; i < 10; i++) {
        const bucketMin = minListing + i * bucketSize;
        const bucketMax = minListing + (i + 1) * bucketSize;
        const count = listingPrices.filter(
          (p) => p >= bucketMin && (i === 9 ? p <= bucketMax : p < bucketMax)
        ).length;
        listingBuckets.push({
          price: Math.round((bucketMin + bucketMax) / 2 * 100) / 100,
          count,
        });
      }
    }

    // Bucket offers into price ranges
    const offerBuckets: { price: number; count: number }[] = [];
    if (offerPrices.length > 0) {
      const maxOffer = offerPrices[0];
      const minOffer = offerPrices[offerPrices.length - 1];
      const range = maxOffer - minOffer;
      const bucketSize = range > 0 ? range / 10 : 0.1;

      for (let i = 0; i < 10; i++) {
        const bucketMax = maxOffer - i * bucketSize;
        const bucketMin = maxOffer - (i + 1) * bucketSize;
        const count = offerPrices.filter(
          (p) => p <= bucketMax && (i === 9 ? p >= bucketMin : p > bucketMin)
        ).length;
        offerBuckets.push({
          price: Math.round((bucketMin + bucketMax) / 2 * 100) / 100,
          count,
        });
      }
    }

    const lowestListing = listingPrices[0] || 0;
    const highestOffer = offerPrices[0] || 0;
    const spread = lowestListing - highestOffer;
    const spreadPercent = highestOffer > 0 ? (spread / highestOffer) * 100 : 0;

    const marketDepth: MarketDepth = {
      listings: listingBuckets,
      offers: offerBuckets.reverse(), // Reverse so lowest is first
      spread: Math.round(spread * 1000) / 1000,
      spreadPercent: Math.round(spreadPercent * 10) / 10,
      lowestListing,
      highestOffer,
      lastUpdated: new Date().toISOString(),
    };

    // Cache for 2 minutes (market data changes frequently)
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
