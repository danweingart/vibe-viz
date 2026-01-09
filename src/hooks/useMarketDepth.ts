"use client";

import { useQuery } from "@tanstack/react-query";
import type { MarketDepth } from "@/types/api";

async function fetchMarketDepth(): Promise<MarketDepth> {
  const response = await fetch("/api/market-depth");
  if (!response.ok) {
    throw new Error("Failed to fetch market depth");
  }
  return response.json();
}

export function useMarketDepth() {
  return useQuery({
    queryKey: ["market-depth"],
    queryFn: fetchMarketDepth,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });
}
