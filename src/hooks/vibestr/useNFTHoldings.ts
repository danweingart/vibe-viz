import { useQuery } from "@tanstack/react-query";
import type { NFTHolding } from "@/app/api/vibestr/holdings/route";

async function fetchNFTHoldings(): Promise<NFTHolding[]> {
  const response = await fetch("/api/vibestr/holdings");

  if (!response.ok) {
    throw new Error(`Failed to fetch holdings: ${response.statusText}`);
  }

  return response.json();
}

export function useNFTHoldings() {
  return useQuery({
    queryKey: ["vibestr-holdings"],
    queryFn: fetchNFTHoldings,
    staleTime: 60 * 60 * 1000, // 1 hour
    refetchInterval: 60 * 60 * 1000, // 1 hour auto-refresh
  });
}
