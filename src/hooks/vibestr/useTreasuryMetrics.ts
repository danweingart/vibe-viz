"use client";

import { useMemo } from "react";
import { useTokenStats } from "./useTokenStats";
import { useNFTHoldings } from "./useNFTHoldings";
import { useEthPrice } from "../useEthPrice";
import {
  calculateNAVRatio,
  calculateInventoryValue,
  calculateFloorPurchaseProgress,
} from "@/lib/vibestr/calculations";

export interface TreasuryMetrics {
  // Treasury Overview
  totalTreasuryEth: number;
  totalTreasuryUsd: number;
  navRatio: number;

  // Inventory
  nftCount: number;
  inventoryValueEth: number;
  inventoryValueUsd: number;

  // Liquidity
  liquidityEth: number;
  liquidityUsd: number;

  // Floor Purchase Progress
  floorPrice: number;
  floorPurchaseProgress: number;
  missingForFloor: number;
  canPurchaseFloor: boolean;

  // Supporting data
  ethPriceUsd: number;
  circulatingSupply: number;
  tokenPriceUsd: number;
}

/**
 * Hook to calculate and compose treasury-related metrics
 * Combines data from token stats, NFT holdings, and ETH price
 */
export function useTreasuryMetrics() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useTokenStats();
  const { data: holdings, isLoading: holdingsLoading, error: holdingsError } = useNFTHoldings();
  const { data: ethPrice, isLoading: ethPriceLoading } = useEthPrice();

  const isLoading = statsLoading || holdingsLoading || ethPriceLoading;
  const error = statsError || holdingsError;

  const metrics = useMemo<TreasuryMetrics | null>(() => {
    if (!stats || !holdings || !ethPrice) return null;

    const ethPriceUsd = ethPrice.usd;

    // Calculate inventory value from NFT holdings
    // Note: Using floor price as approximation since purchase price isn't available in holdings API
    const inventoryValueEth = holdings.length * (stats.floorPrice || 0);

    // Calculate total treasury (liquidity + inventory)
    const totalTreasuryEth = stats.liquidity + inventoryValueEth;
    const totalTreasuryUsd = totalTreasuryEth * ethPriceUsd;

    // Calculate NAV ratio
    const navRatio = calculateNAVRatio(
      totalTreasuryEth,
      stats.priceUsd,
      stats.circulatingSupply,
      ethPriceUsd
    );

    // Get floor price from first holding (assumes sorted by floor)
    // If no holdings, use a default or fetch from collection stats
    const floorPrice = stats.floorPrice || 0;

    // Calculate floor purchase progress
    const floorProgress = calculateFloorPurchaseProgress(
      stats.liquidity,
      floorPrice
    );

    return {
      // Treasury Overview
      totalTreasuryEth,
      totalTreasuryUsd,
      navRatio,

      // Inventory
      nftCount: holdings.length,
      inventoryValueEth,
      inventoryValueUsd: inventoryValueEth * ethPriceUsd,

      // Liquidity
      liquidityEth: stats.liquidity,
      liquidityUsd: stats.liquidity * ethPriceUsd,

      // Floor Purchase Progress
      floorPrice,
      floorPurchaseProgress: floorProgress.progressPercent,
      missingForFloor: floorProgress.missingAmount,
      canPurchaseFloor: floorProgress.canPurchase,

      // Supporting data
      ethPriceUsd,
      circulatingSupply: stats.circulatingSupply,
      tokenPriceUsd: stats.priceUsd,
    };
  }, [stats, holdings, ethPrice]);

  return {
    data: metrics,
    isLoading,
    error,
  };
}
