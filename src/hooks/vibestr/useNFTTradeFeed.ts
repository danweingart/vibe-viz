"use client";

import { useQuery } from "@tanstack/react-query";
import type { NFTHistory, NFTHistorySummary } from "@/types/blockchain";

interface NFTTradeFeedResponse {
  history: NFTHistory[];
  summary: NFTHistorySummary;
  count: number;
}

interface UseNFTTradeFeedOptions {
  days?: number; // Filter to last N days
  page?: number;
  pageSize?: number;
}

export function useNFTTradeFeed(options: UseNFTTradeFeedOptions = {}) {
  const { days = 7, page = 1, pageSize = 10 } = options;

  return useQuery<NFTTradeFeedResponse>({
    queryKey: ["vibestr", "nft-trade-feed", days, page, pageSize],
    queryFn: async () => {
      const response = await fetch(`/api/vibestr/nft-history?status=sold`);
      if (!response.ok) {
        throw new Error("Failed to fetch NFT trade feed");
      }
      const data: NFTTradeFeedResponse = await response.json();

      // Filter to last N days if specified
      const cutoffTime = days ? Date.now() / 1000 - days * 86400 : 0;
      const recentHistory = data.history.filter(
        (nft) => nft.saleDate && nft.saleDate >= cutoffTime
      );

      // Calculate pagination
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedHistory = recentHistory.slice(startIndex, endIndex);

      // Recalculate summary for filtered data
      const filteredSummary = {
        totalSold: recentHistory.length,
        totalProceeds: recentHistory.reduce((sum, nft) => sum + (nft.salePrice || 0), 0),
        totalInvested: recentHistory.reduce((sum, nft) => sum + nft.purchasePrice, 0),
        averageHoldTime: data.summary.averageHoldTime,
        roi: data.summary.roi,
        currentlyHeld: 0,
      };

      return {
        history: paginatedHistory,
        summary: filteredSummary,
        count: recentHistory.length,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000,
  });
}
