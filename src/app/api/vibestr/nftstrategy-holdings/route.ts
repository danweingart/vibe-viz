import { NextRequest, NextResponse } from 'next/server';

// NFTStrategy.fun contract addresses
const VIBESTR_CONTRACT = '0xd0cc2b0efb168bfe1f94a948d8df70fa10257196'; // Strategy contract
const GVC_NFT_CONTRACT = '0xb8ea78fcacef50d41375e44e6814ebba36bb33c4'; // Good Vibes Club NFT

// Cache duration: 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

interface NFTStrategyHolding {
  token_id: string;
  bought_price: number;
  current_price: number;
  image_url: string;
  timestamp: number;
  listing: boolean;
  holding: boolean;
  blockNumber: number;
  transactionHash: string;
}

// In-memory cache
let cachedData: NFTStrategyHolding[] | null = null;
let cacheTimestamp: number = 0;

/**
 * GET /api/vibestr/nftstrategy-holdings
 * Proxy to NFTStrategy.fun holdings API with caching
 */
export async function GET(request: NextRequest) {
  try {
    // Check cache
    const now = Date.now();
    if (cachedData && now - cacheTimestamp < CACHE_TTL) {
      console.log('NFTStrategy holdings: cache hit');
      return NextResponse.json({
        success: true,
        holdings: cachedData,
        count: cachedData.length,
        cached: true,
      });
    }

    // Fetch from NFTStrategy.fun API
    console.log('Fetching holdings from NFTStrategy.fun...');
    const url = new URL('https://www.nftstrategy.fun/api/holdings');
    url.searchParams.set('strategyAddress', VIBESTR_CONTRACT);
    url.searchParams.set('nftAddress', GVC_NFT_CONTRACT);

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`NFTStrategy API returned ${response.status}`);
    }

    const holdings: NFTStrategyHolding[] = await response.json();

    // Update cache
    cachedData = holdings;
    cacheTimestamp = now;

    console.log(`Fetched ${holdings.length} holdings from NFTStrategy.fun`);

    return NextResponse.json({
      success: true,
      holdings,
      count: holdings.length,
      cached: false,
    });
  } catch (error: any) {
    console.error('Failed to fetch holdings from NFTStrategy.fun:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch holdings',
      },
      { status: 500 }
    );
  }
}
