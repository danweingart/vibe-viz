"use client";

import { useQuery } from "@tanstack/react-query";
import type { DailyTraderStats, FlipRecord } from "@/types/api";

interface TraderAnalysis {
  dailyStats: DailyTraderStats[];
  flips: FlipRecord[];
  topBuyers: { address: string; count: number; volume: number }[];
  topSellers: { address: string; count: number; volume: number }[];
  repeatBuyerRate: number;
  avgHoldingPeriod: number;
}

async function fetchTraderAnalysis(days: number): Promise<TraderAnalysis> {
  const response = await fetch(`/api/trader-analysis?days=${days}`);
  if (!response.ok) {
    throw new Error("Failed to fetch trader analysis");
  }
  return response.json();
}

export function useTraderAnalysis(days: number = 30) {
  return useQuery({
    queryKey: ["trader-analysis", days],
    queryFn: () => fetchTraderAnalysis(days),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

export type { TraderAnalysis };
