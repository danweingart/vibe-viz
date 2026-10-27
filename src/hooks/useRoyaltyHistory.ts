"use client";

import { useQuery } from "@tanstack/react-query";
import type { RoyaltyHistory } from "@/types/royalties";

export function useRoyaltyHistory() {
  return useQuery<RoyaltyHistory>({
    queryKey: ["gvc-royalty-history"],
    queryFn: async () => {
      const response = await fetch("/api/royalties");
      if (!response.ok) throw new Error("Royalty history is temporarily unavailable.");
      return response.json();
    },
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    retry: 1,
  });
}
