"use client";

import { useQuery } from "@tanstack/react-query";
import type { TokenStats } from "@/types/vibestr";

async function fetchTokenStats(): Promise<TokenStats> {
  const response = await fetch("/api/vibestr/stats");
  if (!response.ok) {
    throw new Error("Failed to fetch token stats");
  }
  return response.json();
}

export function useTokenStats() {
  return useQuery({
    queryKey: ["vibestr-stats"],
    queryFn: fetchTokenStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });
}
