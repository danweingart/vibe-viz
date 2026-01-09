"use client";

import { useQuery } from "@tanstack/react-query";
import { COLLECTION_SLUG } from "@/lib/constants";
import type { DailyStats } from "@/types/api";

export async function fetchPriceHistory(
  days: number,
  collection: string = COLLECTION_SLUG
): Promise<DailyStats[]> {
  const params = new URLSearchParams({ days: String(days) });
  if (collection !== COLLECTION_SLUG) {
    params.set("collection", collection);
  }
  const response = await fetch(`/api/price-history?${params}`);
  if (!response.ok) {
    throw new Error("Failed to fetch price history");
  }
  return response.json();
}

export function usePriceHistory(
  days: number = 7,
  collection: string = COLLECTION_SLUG
) {
  return useQuery({
    queryKey: ["price-history", days, collection],
    queryFn: () => fetchPriceHistory(days, collection),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 1000,
  });
}
