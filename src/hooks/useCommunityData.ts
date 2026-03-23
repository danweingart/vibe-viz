"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Types matching API response shapes (no ENS names — resolved separately)

export interface HolderEntry {
  address: string;
  tokenCount: number;
  percentOfSupply: number;
  hasActiveListing: boolean;
  lastTransferTimestamp: number | null;
}

export interface HoldersResponse {
  holders: HolderEntry[];
  diamondHands: HolderEntry[];
  stats: {
    totalHolders: number;
    diamondHandsCount: number;
    diamondHandsPercent: number;
    totalSupply: number;
    topHolderConcentration: number;
  };
}

export interface NewCollector {
  address: string;
  firstPurchaseTimestamp: number;
  tokensAcquired: number;
}

export interface Accumulator {
  address: string;
  buysThisMonth: number;
  currentHoldings: number;
}

export interface ActivityResponse {
  newCollectors: NewCollector[];
  accumulators: Accumulator[];
  stats: {
    newCollectors30d: number;
    accumulatorCount: number;
    totalBuys30d: number;
    totalSells30d: number;
    netAccumulationRate: number;
  };
}

export interface VibestrHolder {
  address: string;
  balance: number;
  lastSellTimestamp: number | null;
}

export interface VibestrNewBuyer {
  address: string;
  firstBuyTimestamp: number;
  amountPurchased: number;
}

export interface VibestrActivityResponse {
  diamondHands: VibestrHolder[];
  newBuyers: VibestrNewBuyer[];
  stats: {
    totalHolders: number;
    diamondHandsCount: number;
    newBuyers30d: number;
    totalTransfers30d: number;
  };
}

async function fetchCommunityHolders(): Promise<HoldersResponse> {
  const response = await fetch("/api/community/holders");
  if (!response.ok) throw new Error("Failed to fetch community holders");
  return response.json();
}

async function fetchCommunityActivity(): Promise<ActivityResponse> {
  const response = await fetch("/api/community/activity");
  if (!response.ok) throw new Error("Failed to fetch community activity");
  return response.json();
}

async function fetchVibestrActivity(): Promise<VibestrActivityResponse> {
  const response = await fetch("/api/community/vibestr-activity");
  if (!response.ok) throw new Error("Failed to fetch VIBESTR activity");
  return response.json();
}

export function useCommunityHolders() {
  return useQuery({
    queryKey: ["community-holders"],
    queryFn: fetchCommunityHolders,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
    // Auto-refetch every 5s while data is still building (progressive load)
    refetchInterval: (query) => {
      const data = query.state.data as HoldersResponse | undefined;
      if (data && '_partial' in data && (data as HoldersResponse & { _partial?: boolean })._partial) {
        return 5000;
      }
      return false;
    },
  });
}

export function useCommunityActivity() {
  return useQuery({
    queryKey: ["community-activity"],
    queryFn: fetchCommunityActivity,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
  });
}

export function useVibestrActivity() {
  return useQuery({
    queryKey: ["community-vibestr-activity"],
    queryFn: fetchVibestrActivity,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Lazy name resolution hook.
 *
 * Sends ALL addresses to the server. The server returns cached names
 * instantly and resolves uncached ones within a 5s time budget.
 * The client re-fetches every 10s while names are still missing,
 * progressively building up the full name map.
 */
async function fetchDisplayNames(addresses: string[]): Promise<Record<string, string | null>> {
  if (addresses.length === 0) return {};
  const response = await fetch("/api/community/ens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ addresses }),
  });
  if (!response.ok) return {};
  return response.json();
}

export function useENSNames(addresses: string[]) {
  return useQuery({
    queryKey: ["ens-names", addresses.sort().join(",")],
    queryFn: () => fetchDisplayNames(addresses),
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    enabled: addresses.length > 0,
    retry: 1,
    // Re-fetch every 10s while there are still unresolved names
    refetchInterval: (query) => {
      const data = query.state.data as Record<string, string | null> | undefined;
      if (!data) return false;
      const hasUnresolved = Object.values(data).some((v) => v === null) ||
        Object.keys(data).length < addresses.length;
      return hasUnresolved ? 10000 : false;
    },
  });
}

// ─── Account Tags ────────────────────────────────────────────────────

async function fetchAccountTags(): Promise<Record<string, string>> {
  const response = await fetch("/api/community/tags");
  if (!response.ok) return {};
  return response.json();
}

export function useAccountTags() {
  return useQuery({
    queryKey: ["account-tags"],
    queryFn: fetchAccountTags,
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

export function useSetAccountTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ address, name }: { address: string; name: string }) => {
      const response = await fetch("/api/community/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, name }),
      });
      if (!response.ok) throw new Error("Failed to set tag");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-tags"] });
    },
  });
}

export function useDeleteAccountTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (address: string) => {
      const response = await fetch("/api/community/tags", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      if (!response.ok) throw new Error("Failed to delete tag");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-tags"] });
    },
  });
}
