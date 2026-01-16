import { NextRequest, NextResponse } from 'next/server';

// NFTStrategy.fun contract addresses
const VIBESTR_CONTRACT = '0xd0cc2b0efb168bfe1f94a948d8df70fa10257196'; // Strategy contract
const GVC_NFT_CONTRACT = '0xb8ea78fcacef50d41375e44e6814ebba36bb33c4'; // Good Vibes Club NFT

// Cache duration: 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

interface NFTStrategySold {
  token_id: string;
  bought_price: number;
  sold_price: number;
  image_url: string;
  timestamp: number;
}

// In-memory cache
let cachedData: NFTStrategySold[] | null = null;
let cacheTimestamp: number = 0;

/**
 * GET /api/vibestr/nftstrategy-sold
 * Proxy to NFTStrategy.fun sold API with caching
 */
export async function GET(request: NextRequest) {
  try {
    // Check cache
    const now = Date.now();
    if (cachedData && now - cacheTimestamp < CACHE_TTL) {
      console.log('NFTStrategy sold: cache hit');
      return NextResponse.json({
        success: true,
        sold: cachedData,
        count: cachedData.length,
        cached: true,
      });
    }

    // Fetch from NFTStrategy.fun API
    console.log('Fetching sold NFTs from NFTStrategy.fun...');
    const url = new URL('https://www.nftstrategy.fun/api/sold');
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

    const sold: NFTStrategySold[] = await response.json();

    // Update cache
    cachedData = sold;
    cacheTimestamp = now;

    console.log(`Fetched ${sold.length} sold NFTs from NFTStrategy.fun`);

    return NextResponse.json({
      success: true,
      sold,
      count: sold.length,
      cached: false,
    });
  } catch (error: any) {
    console.error('Failed to fetch sold NFTs from NFTStrategy.fun:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch sold NFTs',
      },
      { status: 500 }
    );
  }
}
