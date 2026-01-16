/**
 * NFTStrategy.fun API Client
 * Fetches NFT holdings and sold data directly from NFTStrategy.fun
 */

// Contract addresses
const VIBESTR_CONTRACT = '0xd0cc2b0efb168bfe1f94a948d8df70fa10257196'; // Strategy contract
const GVC_NFT_CONTRACT = '0xb8ea78fcacef50d41375e44e6814ebba36bb33c4'; // Good Vibes Club NFT

export interface NFTStrategyHolding {
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

export interface NFTStrategySold {
  token_id: string;
  bought_price: number;
  sold_price: number;
  image_url: string;
  timestamp: number;
}

/**
 * Fetch holdings from NFTStrategy.fun API
 */
export async function fetchHoldings(): Promise<NFTStrategyHolding[]> {
  const url = new URL('https://www.nftstrategy.fun/api/holdings');
  url.searchParams.set('strategyAddress', VIBESTR_CONTRACT);
  url.searchParams.set('nftAddress', GVC_NFT_CONTRACT);

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`NFTStrategy holdings API returned ${response.status}`);
  }

  return await response.json();
}

/**
 * Fetch sold NFTs from NFTStrategy.fun API
 */
export async function fetchSold(): Promise<NFTStrategySold[]> {
  const url = new URL('https://www.nftstrategy.fun/api/sold');
  url.searchParams.set('strategyAddress', VIBESTR_CONTRACT);
  url.searchParams.set('nftAddress', GVC_NFT_CONTRACT);

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`NFTStrategy sold API returned ${response.status}`);
  }

  return await response.json();
}

/**
 * Fetch both holdings and sold data
 */
export async function fetchAllNFTData() {
  const [holdings, sold] = await Promise.all([
    fetchHoldings(),
    fetchSold(),
  ]);

  return { holdings, sold };
}

/**
 * Fetch strategy data from NFTStrategy.fun strategies endpoint
 * This returns high-level stats about the VIBESTR strategy
 */
export async function getVibestrData() {
  const url = `https://www.nftstrategy.fun/api/strategies/${VIBESTR_CONTRACT}`;

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`NFTStrategy strategies API returned ${response.status}`);
  }

  const result = await response.json();
  return result; // Return the full response with { data: { ... } } structure
}
