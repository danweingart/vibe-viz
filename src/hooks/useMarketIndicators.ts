"use client";

import { useQuery } from "@tanstack/react-query";
import type { MarketIndicators } from "@/types/api";

async function fetchMarketIndicators(): Promise<MarketIndicators> {
  const response = await fetch("/api/market-indicators");
  if (!response.ok) {
    throw new Error("Failed to fetch market indicators");
  }
  return response.json();
}

export function useMarketIndicators() {
  return useQuery({
    queryKey: ["market-indicators"],
    queryFn: fetchMarketIndicators,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });
}
