"use client";

import { useQuery } from "@tanstack/react-query";
import type { BurnMetrics } from "@/app/api/vibestr/burn/route";

async function fetchRealtimeBurn(): Promise<BurnMetrics> {
  const response = await fetch("/api/vibestr/burn");
  if (!response.ok) {
    throw new Error("Failed to fetch real-time burn metrics");
  }
  return response.json();
}

export function useRealtimeBurn() {
  return useQuery({
    queryKey: ["vibestr-realtime-burn"],
    queryFn: fetchRealtimeBurn,
    staleTime: 60 * 1000, // 60 seconds
    refetchInterval: 60 * 1000, // Auto-refresh every 60 seconds
  });
}
