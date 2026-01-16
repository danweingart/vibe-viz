"use client";

import { useQuery } from "@tanstack/react-query";
import type { VolumeStats } from "@/types/vibestr";

async function fetchVolumeHistory(days: number): Promise<VolumeStats[]> {
  const response = await fetch(`/api/vibestr/volume-history?days=${days}`);
  if (!response.ok) {
    throw new Error("Failed to fetch volume history");
  }
  return response.json();
}

export function useVolumeHistory(days: number = 7) {
  return useQuery({
    queryKey: ["vibestr-volume-history", days],
    queryFn: () => fetchVolumeHistory(days),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
