"use client";

import { useQuery } from "@tanstack/react-query";
import type { NFTTrade } from "@/types/vibestr";

async function fetchNFTTrades(): Promise<NFTTrade[]> {
  const response = await fetch("/api/vibestr/nft-trades");
  if (!response.ok) {
    throw new Error("Failed to fetch NFT trades");
  }
  return response.json();
}

export function useNFTTrades() {
  return useQuery({
    queryKey: ["vibestr-nft-trades"],
    queryFn: fetchNFTTrades,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 10 * 60 * 1000,
  });
}
