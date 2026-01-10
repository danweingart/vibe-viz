"use client";

import { Card } from "@/components/ui";
import { StatCardSkeleton } from "@/components/ui/Skeleton";
import { useCollectionStats, usePriceHistory } from "@/hooks";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatEth, formatUsd, formatNumber, formatPercent } from "@/lib/utils";

export function StatsOverview() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useCollectionStats();
  const { timeRange, currency } = useChartSettings();
  const { data: priceHistory, isLoading: historyLoading } = usePriceHistory(timeRange);

  const isLoading = statsLoading || historyLoading;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (statsError || !stats) {
    return (
      <div className="rounded-xl border border-chart-danger/50 bg-chart-danger/10 p-6 text-center">
        <p className="text-chart-danger">Failed to load collection stats</p>
      </div>
    );
  }

  // Calculate time-based stats from price history
  const periodVolume = priceHistory?.reduce((sum, d) => sum + d.volume, 0) || 0;
  const periodVolumeUsd = priceHistory?.reduce((sum, d) => sum + d.volumeUsd, 0) || 0;
  const periodSales = priceHistory?.reduce((sum, d) => sum + d.salesCount, 0) || 0;
  const periodAvgPrice = periodSales > 0 ? periodVolume / periodSales : 0;
  const latestEthPrice = priceHistory?.[priceHistory.length - 1]?.ethPrice || 0;
  const periodAvgPriceUsd = periodAvgPrice * latestEthPrice;

  const statsData = [
    {
      label: "Floor Price",
      value: currency === "eth" ? formatEth(stats.floorPrice, 2) : formatUsd(stats.floorPriceUsd, 0),
      subValue: currency === "eth" ? formatUsd(stats.floorPriceUsd, 0) : formatEth(stats.floorPrice, 2),
      highlight: true,
    },
    {
      label: "Total Volume",
      value: currency === "eth" ? formatEth(stats.totalVolume, 0) : formatUsd(stats.totalVolumeUsd, 0),
      subValue: currency === "eth" ? formatUsd(stats.totalVolumeUsd, 0) : formatEth(stats.totalVolume, 0),
    },
    {
      label: "Unique Owners",
      value: formatNumber(stats.numOwners),
      subValue: "wallets",
    },
    {
      label: `${timeRange}D Avg Price`,
      value: currency === "eth" ? formatEth(periodAvgPrice, 2) : formatUsd(periodAvgPriceUsd, 0),
      subValue: currency === "eth" ? formatUsd(periodAvgPriceUsd, 0) : formatEth(periodAvgPrice, 2),
    },
    {
      label: `${timeRange}D Volume`,
      value: currency === "eth" ? formatEth(periodVolume, 2) : formatUsd(periodVolumeUsd, 0),
      subValue: currency === "eth" ? formatUsd(periodVolumeUsd, 0) : formatEth(periodVolume, 2),
    },
    {
      label: `${timeRange}D Sales`,
      value: formatNumber(periodSales),
      subValue: "transactions",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statsData.map((stat, index) => (
        <StatCard key={stat.label} {...stat} animationDelay={index} />
      ))}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  change?: number;
  highlight?: boolean;
  animationDelay?: number;
}

function StatCard({ label, value, subValue, change, highlight, animationDelay = 0 }: StatCardProps) {
  const delayClass = `animate-delay-${animationDelay}`;
  return (
    <Card
      className={`relative overflow-hidden animate-fade-in p-3 ${delayClass} ${
        highlight ? "border-brand/50 brand-glow-pulse" : ""
      }`}
    >
      {highlight && (
        <div className="absolute inset-0 bg-gradient-to-br from-brand/10 to-transparent" />
      )}
      <div className="relative text-center">
        <p className="text-[10px] text-foreground-muted uppercase tracking-wider mb-1.5">
          {label}
        </p>
        <p className="text-lg font-bold text-foreground font-brice leading-tight">{value}</p>
        <div className="flex items-center justify-center gap-1.5 mt-0.5">
          {subValue && (
            <span className="text-xs text-foreground-muted">{subValue}</span>
          )}
          {change !== undefined && (
            <span
              className={`text-[10px] font-medium ${
                change >= 0 ? "text-chart-success" : "text-chart-danger"
              }`}
            >
              {formatPercent(change)}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
