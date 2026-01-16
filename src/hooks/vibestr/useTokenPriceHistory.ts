"use client";

import { useQuery } from "@tanstack/react-query";
import type { DailyTokenStats } from "@/types/vibestr";

async function fetchTokenPriceHistory(days: number): Promise<DailyTokenStats[]> {
  const response = await fetch(`/api/vibestr/price-history?days=${days}`);
  if (!response.ok) {
    throw new Error("Failed to fetch token price history");
  }
  return response.json();
}

export function useTokenPriceHistory(days: number = 7) {
  return useQuery({
    queryKey: ["vibestr-price-history", days],
    queryFn: () => fetchTokenPriceHistory(days),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });
}
