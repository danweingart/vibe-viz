"use client";

import { useQuery } from "@tanstack/react-query";
import type { BurnRecord } from "@/types/vibestr";

async function fetchBurnHistory(days: number): Promise<BurnRecord[]> {
  const response = await fetch(`/api/vibestr/burn-history?days=${days}`);
  if (!response.ok) {
    throw new Error("Failed to fetch burn history");
  }
  return response.json();
}

export function useBurnHistory(days: number = 30) {
  return useQuery({
    queryKey: ["vibestr-burn-history", days],
    queryFn: () => fetchBurnHistory(days),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}
