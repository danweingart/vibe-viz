"use client";

import { useQuery } from "@tanstack/react-query";
import type { DexScreenerResponse, DexScreenerPair } from "@/types/vibestr";

async function fetchDexScreenerStats(): Promise<DexScreenerPair | null> {
  const response = await fetch("/api/vibestr/dexscreener");
  if (!response.ok) {
    throw new Error("Failed to fetch DexScreener stats");
  }
  const data: DexScreenerResponse = await response.json();
  // Return the first (most liquid) pair
  return data.pairs?.[0] ?? null;
}

export function useDexScreenerStats() {
  return useQuery({
    queryKey: ["vibestr-dexscreener"],
    queryFn: fetchDexScreenerStats,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 2 * 60 * 1000,
  });
}
