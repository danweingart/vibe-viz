"use client";

import { useQuery } from "@tanstack/react-query";
import type { EthPrice } from "@/types/api";

async function fetchEthPrice(): Promise<EthPrice> {
  const response = await fetch("/api/eth-price");
  if (!response.ok) {
    throw new Error("Failed to fetch ETH price");
  }
  return response.json();
}

export function useEthPrice() {
  return useQuery({
    queryKey: ["eth-price"],
    queryFn: fetchEthPrice,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });
}
