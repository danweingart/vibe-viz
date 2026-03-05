"use client";

import { useQuery } from "@tanstack/react-query";
import type { MarketHistoryPoint } from "@/types/vibestr";

async function fetchMarketHistory(): Promise<MarketHistoryPoint[]> {
  const response = await fetch("/api/vibestr/market-history");
  if (!response.ok) {
    throw new Error("Failed to fetch market history");
  }
  return response.json();
}

export function useMarketHistory() {
  return useQuery({
    queryKey: ["vibestr-market-history"],
    queryFn: fetchMarketHistory,
    staleTime: 30 * 60 * 1000, // 30 minutes
    refetchInterval: 30 * 60 * 1000,
  });
}
