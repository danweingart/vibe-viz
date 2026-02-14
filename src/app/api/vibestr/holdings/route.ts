import { NextRequest, NextResponse } from "next/server";
import { cache } from "@/lib/cache/postgres";
import { VIBESTR_CACHE_TTL, VIBESTR_STRATEGY_ID } from "@/lib/constants";

const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY || "";
const OPENSEA_API_BASE = "https://api.opensea.io/api/v2";
const GVC_CONTRACT = "0xb8ea78fcacef50d41375e44e6814ebba36bb33c4";

interface OpenSeaListing {
  price: {
    current: {
      value: string; // Wei format
      decimals: number;
    };
  };
}

interface OpenSeaNFT {
  identifier: string;
  name: string;
  image_url: string;
  token_standard: string;
  listings?: OpenSeaListing[];
  best_offer?: {
    value: string;
    decimals: number;
  };
}

interface OpenSeaResponse {
  nfts: OpenSeaNFT[];
  next: string | null;
}

export interface NFTHolding {
  tokenId: string;
  name: string;
  image: string;
  listingPrice?: number; // ETH
  bestOffer?: number; // ETH
}

async function fetchAllNFTs(ownerAddress: string): Promise<NFTHolding[]> {
  const allNFTs: NFTHolding[] = [];
  let nextCursor: string | null = null;
  let pageCount = 0;
  const maxPages = 10; // Safety limit (50 per page = 500 max)

  do {
    try {
      const url = new URL(`${OPENSEA_API_BASE}/chain/ethereum/account/${ownerAddress}/nfts`);
      url.searchParams.set("collection", "good-vibes-club");
      url.searchParams.set("limit", "50");
      if (nextCursor) {
        url.searchParams.set("next", nextCursor);
      }

      const response = await fetch(url.toString(), {
        headers: {
          "X-API-KEY": OPENSEA_API_KEY,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        console.error(`OpenSea API error: ${response.status} ${response.statusText}`);
        break;
      }

      const data: OpenSeaResponse = await response.json();

      // Transform OpenSea NFTs to our format
      const nfts = data.nfts.map((nft) => {
        // Extract listing price (first active listing)
        let listingPrice: number | undefined;
        if (nft.listings && nft.listings.length > 0) {
          const listing = nft.listings[0];
          const priceWei = BigInt(listing.price.current.value);
          const decimals = listing.price.current.decimals;
          listingPrice = Number(priceWei) / Math.pow(10, decimals);
        }

        // Extract best offer
        let bestOffer: number | undefined;
        if (nft.best_offer) {
          const offerWei = BigInt(nft.best_offer.value);
          const decimals = nft.best_offer.decimals;
          bestOffer = Number(offerWei) / Math.pow(10, decimals);
        }

        return {
          tokenId: nft.identifier,
          name: nft.name || `Good Vibes Club #${nft.identifier}`,
          image: nft.image_url || "",
          listingPrice,
          bestOffer,
        };
      });

      allNFTs.push(...nfts);
      nextCursor = data.next;
      pageCount++;

      console.log(`Fetched page ${pageCount}: ${nfts.length} NFTs (total: ${allNFTs.length})`);

      // Safety check
      if (pageCount >= maxPages) {
        console.warn(`Reached max pages (${maxPages}), stopping pagination`);
        break;
      }
    } catch (error) {
      console.error("Error fetching NFTs from OpenSea:", error);
      break;
    }
  } while (nextCursor);

  return allNFTs;
}

export async function GET(request: NextRequest) {
  const cacheKey = "vibestr-holdings";

  // Check cache first
  const cached = await cache.get<NFTHolding[]>(cacheKey);
  if (cached) {
    console.log(`Returning cached holdings (${cached.length} NFTs)`);
    return NextResponse.json(cached);
  }

  console.log("Fetching fresh holdings from OpenSea");

  try {
    const holdings = await fetchAllNFTs(VIBESTR_STRATEGY_ID);

    if (holdings.length === 0) {
      return NextResponse.json(
        { error: "No NFTs found for strategy contract" },
        { status: 404 }
      );
    }

    // Cache for 1 hour
    await cache.set(cacheKey, holdings, VIBESTR_CACHE_TTL.HOLDINGS);
    console.log(`Holdings cached successfully (${holdings.length} NFTs)`);

    return NextResponse.json(holdings);
  } catch (error) {
    console.error("Error in holdings route:", error);
    return NextResponse.json(
      { error: "Failed to fetch holdings" },
      { status: 500 }
    );
  }
}
