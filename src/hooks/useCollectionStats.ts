"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { CollectionStats } from "@/types/api";

async function fetchCollectionStats(): Promise<CollectionStats> {
  const response = await fetch("/api/collection/stats");
  if (!response.ok) {
    throw new Error("Failed to fetch collection stats");
  }
  return response.json();
}

export function useCollectionStats() {
  return useQuery({
    queryKey: ["collection-stats"],
    queryFn: fetchCollectionStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });
}

export function useRefreshStats() {
  const queryClient = useQueryClient();

  const refresh = async () => {
    // Invalidate the cache on the server
    await fetch("/api/refresh", { method: "POST" });
    // Then refetch on the client
    await queryClient.invalidateQueries({ queryKey: ["collection-stats"] });
    await queryClient.invalidateQueries({ queryKey: ["events"] });
    await queryClient.invalidateQueries({ queryKey: ["eth-price"] });
  };

  return { refresh };
}
