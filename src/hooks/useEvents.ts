"use client";

import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import type { SaleRecord } from "@/types/api";

interface EventsResponse {
  events: SaleRecord[];
  nextCursor: string | null;
  hasMore: boolean;
}

async function fetchEvents(cursor?: string): Promise<EventsResponse> {
  const params = new URLSearchParams();
  params.set("type", "sale");
  params.set("limit", "20");
  if (cursor) params.set("cursor", cursor);

  const response = await fetch(`/api/events?${params}`);
  if (!response.ok) {
    throw new Error("Failed to fetch events");
  }
  return response.json();
}

async function fetchAllSalesInRange(days: number): Promise<SaleRecord[]> {
  const allSales: SaleRecord[] = [];
  let cursor: string | undefined;
  let hasMore = true;

  // Scale max pages based on time range to fetch all sales
  const maxPages = days <= 7 ? 5 : days <= 30 ? 10 : 20;
  let page = 0;

  while (hasMore && page < maxPages) {
    const params = new URLSearchParams();
    params.set("type", "sale");
    params.set("limit", "100");
    params.set("days", String(days));
    if (cursor) params.set("cursor", cursor);

    const response = await fetch(`/api/events?${params}`);
    if (!response.ok) {
      throw new Error("Failed to fetch sales");
    }

    const data: EventsResponse = await response.json();
    allSales.push(...data.events);
    cursor = data.nextCursor || undefined;
    hasMore = data.hasMore;
    page++;
  }

  return allSales;
}

export function useRecentSales(limit = 10) {
  return useQuery({
    queryKey: ["events", "recent", limit],
    queryFn: async () => {
      const response = await fetch(`/api/events?limit=${limit}`);
      if (!response.ok) {
        throw new Error("Failed to fetch recent sales");
      }
      const data: EventsResponse = await response.json();
      return data.events;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useSalesByTimeRange(days: number) {
  return useQuery({
    queryKey: ["events", "timeRange", days],
    queryFn: () => fetchAllSalesInRange(days),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useInfiniteSales() {
  return useInfiniteQuery({
    queryKey: ["events", "infinite"],
    queryFn: ({ pageParam }) => fetchEvents(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    staleTime: 2 * 60 * 1000,
  });
}
