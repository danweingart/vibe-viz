import { COINGECKO_API_BASE } from "@/lib/constants";

interface CoinGeckoPrice {
  ethereum: {
    usd: number;
    usd_24h_change: number;
  };
}

interface CoinGeckoHistoricalPrice {
  prices: [number, number][]; // [timestamp, price]
}

async function fetchWithRetry<T>(
  url: string,
  retries = 3
): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 }, // Cache for 1 minute
      });

      if (response.status === 429) {
        // Rate limited - wait and retry
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      if (attempt === retries - 1) throw error;
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }

  throw new Error("Max retries exceeded");
}

export async function getEthPrice(): Promise<{
  usd: number;
  usd_24h_change: number;
}> {
  const data = await fetchWithRetry<CoinGeckoPrice>(
    `${COINGECKO_API_BASE}/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true`
  );

  return {
    usd: data.ethereum.usd,
    usd_24h_change: data.ethereum.usd_24h_change,
  };
}

export async function getHistoricalPrices(
  days: number
): Promise<Map<string, number>> {
  const data = await fetchWithRetry<CoinGeckoHistoricalPrice>(
    `${COINGECKO_API_BASE}/coins/ethereum/market_chart?vs_currency=usd&days=${days}`
  );

  // Create a map of date -> average price for that day
  const pricesByDate = new Map<string, number[]>();

  for (const [timestamp, price] of data.prices) {
    const date = new Date(timestamp).toISOString().split("T")[0];
    if (!pricesByDate.has(date)) {
      pricesByDate.set(date, []);
    }
    pricesByDate.get(date)!.push(price);
  }

  // Calculate average price for each day
  const avgPrices = new Map<string, number>();
  for (const [date, prices] of pricesByDate) {
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    avgPrices.set(date, avg);
  }

  return avgPrices;
}
