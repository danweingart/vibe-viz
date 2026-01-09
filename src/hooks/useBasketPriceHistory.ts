"use client";

import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { COMPARISON_COLLECTIONS } from "@/lib/constants";
import { fetchPriceHistory } from "./usePriceHistory";
import type { DailyStats } from "@/types/api";

interface BasketAggregatedData {
  // Average premium percentages across basket
  salesAbove10Pct: number;
  salesAbove25Pct: number;
  salesAbove50Pct: number;
  // Average payment ratios
  ethPaymentPct: number;
  wethPaymentPct: number;
  // Totals for context
  totalSales: number;
}

interface BasketDailyData {
  date: string;
  salesAbove10Pct: number;
  salesAbove25Pct: number;
  salesAbove50Pct: number;
  // Daily payment percentages
  ethPct: number;
  wethPct: number;
}

function averageBasketData(
  allCollectionData: (DailyStats[] | undefined)[]
): {
  dailyData: BasketDailyData[];
  aggregated: BasketAggregatedData;
} {
  const validData = allCollectionData.filter(
    (d): d is DailyStats[] => d !== undefined && d.length > 0
  );

  if (validData.length === 0) {
    return {
      dailyData: [],
      aggregated: {
        salesAbove10Pct: 0,
        salesAbove25Pct: 0,
        salesAbove50Pct: 0,
        ethPaymentPct: 0,
        wethPaymentPct: 0,
        totalSales: 0,
      },
    };
  }

  // Aggregate payment volume data across all collections (volume-weighted)
  let totalEthVolume = 0;
  let totalWethVolume = 0;
  let totalSalesCount = 0;

  // Track premium and payment volume data by date for daily aggregation
  const dateMap = new Map<
    string,
    {
      above10: number[];
      above25: number[];
      above50: number[];
      ethVolume: number;
      wethVolume: number;
    }
  >();

  for (const collectionData of validData) {
    for (const day of collectionData) {
      // Use volume fields if available, fallback to count for backward compatibility
      const ethVol = day.ethVolume ?? day.ethPayments * day.avgPrice;
      const wethVol = day.wethVolume ?? day.wethPayments * day.avgPrice;

      totalEthVolume += ethVol;
      totalWethVolume += wethVol;
      totalSalesCount += day.salesCount;

      if (!dateMap.has(day.date)) {
        dateMap.set(day.date, {
          above10: [],
          above25: [],
          above50: [],
          ethVolume: 0,
          wethVolume: 0,
        });
      }
      const entry = dateMap.get(day.date)!;
      entry.above10.push(day.salesAbove10Pct);
      entry.above25.push(day.salesAbove25Pct);
      entry.above50.push(day.salesAbove50Pct);
      entry.ethVolume += ethVol;
      entry.wethVolume += wethVol;
    }
  }

  // Calculate daily data using volume-weighted percentages
  const dailyData: BasketDailyData[] = [];
  const sortedDates = Array.from(dateMap.keys()).sort();

  for (const date of sortedDates) {
    const entry = dateMap.get(date)!;
    const dayTotalVolume = entry.ethVolume + entry.wethVolume; // Exclude Other payments
    dailyData.push({
      date,
      salesAbove10Pct:
        entry.above10.reduce((a, b) => a + b, 0) / entry.above10.length,
      salesAbove25Pct:
        entry.above25.reduce((a, b) => a + b, 0) / entry.above25.length,
      salesAbove50Pct:
        entry.above50.reduce((a, b) => a + b, 0) / entry.above50.length,
      // Volume-weighted payment percentages
      ethPct: dayTotalVolume > 0 ? (entry.ethVolume / dayTotalVolume) * 100 : 0,
      wethPct: dayTotalVolume > 0 ? (entry.wethVolume / dayTotalVolume) * 100 : 0,
    });
  }

  // Calculate overall averages
  const allAbove10 = dailyData.map((d) => d.salesAbove10Pct);
  const allAbove25 = dailyData.map((d) => d.salesAbove25Pct);
  const allAbove50 = dailyData.map((d) => d.salesAbove50Pct);

  // Volume-weighted totals (exclude Other payments)
  const totalVolume = totalEthVolume + totalWethVolume;

  return {
    dailyData,
    aggregated: {
      salesAbove10Pct:
        allAbove10.length > 0
          ? allAbove10.reduce((a, b) => a + b, 0) / allAbove10.length
          : 0,
      salesAbove25Pct:
        allAbove25.length > 0
          ? allAbove25.reduce((a, b) => a + b, 0) / allAbove25.length
          : 0,
      salesAbove50Pct:
        allAbove50.length > 0
          ? allAbove50.reduce((a, b) => a + b, 0) / allAbove50.length
          : 0,
      // Volume-weighted payment percentages
      ethPaymentPct:
        totalVolume > 0 ? (totalEthVolume / totalVolume) * 100 : 0,
      wethPaymentPct:
        totalVolume > 0 ? (totalWethVolume / totalVolume) * 100 : 0,
      totalSales: totalSalesCount,
    },
  };
}

export function useBasketPriceHistory(days: number = 7) {
  // Stagger fetches to avoid rate limiting - add delay based on index
  const queries = useQueries({
    queries: COMPARISON_COLLECTIONS.map((c, index) => ({
      queryKey: ["price-history", days, c.slug],
      queryFn: async () => {
        // Stagger requests by 500ms per collection to avoid rate limiting
        if (index > 0) {
          await new Promise((resolve) => setTimeout(resolve, index * 500));
        }
        return fetchPriceHistory(days, c.slug);
      },
      staleTime: 10 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 3,
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
    })),
  });

  return useMemo(() => {
    const isLoading = queries.some((q) => q.isLoading);
    const isFetching = queries.some((q) => q.isFetching);
    const successfulQueries = queries.filter((q) => q.isSuccess && q.data);
    const hasAnyData = successfulQueries.length > 0;

    if (isLoading) {
      return { data: undefined, isLoading: true, isFetching: true, isError: false, error: undefined };
    }

    // Use partial data if at least one collection succeeded
    if (!hasAnyData) {
      const error = queries.find((q) => q.error)?.error;
      return { data: undefined, isLoading: false, isFetching, isError: true, error };
    }

    const { dailyData, aggregated } = averageBasketData(
      queries.map((q) => q.data)
    );

    return {
      data: { dailyData, aggregated, collectionsLoaded: successfulQueries.length },
      isLoading: false,
      isFetching,
      isError: false,
      error: undefined,
    };
  }, [queries]);
}

export type { BasketAggregatedData, BasketDailyData };
