"use client";

import { Card } from "@/components/ui";
import { StatCardSkeleton } from "@/components/ui/Skeleton";
import { useTokenStats } from "@/hooks/vibestr";
import { formatUsd, formatNumber, formatPercent } from "@/lib/utils";

export function TokenStatsOverview() {
  const { data: stats, isLoading, error } = useTokenStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-xl border border-chart-danger/50 bg-chart-danger/10 p-6 text-center">
        <p className="text-chart-danger">Failed to load token stats</p>
      </div>
    );
  }

  const statsData = [
    {
      label: "Token Price",
      value: formatUsd(stats.priceUsd, 4),
      subValue: formatPercent(stats.priceChange24h),
      change: stats.priceChange24h,
      highlight: true,
    },
    {
      label: "Market Cap",
      value: formatUsd(stats.marketCap, 0),
      subValue: "fully diluted",
    },
    {
      label: "24h Volume",
      value: formatUsd(stats.volume24h, 0),
      subValue: "trading volume",
    },
    {
      label: "Liquidity",
      value: formatUsd(stats.liquidity, 0),
      subValue: "available",
    },
    {
      label: "Burned",
      value: `${(stats.burnedAmount / 1e9).toFixed(1)}B`,
      subValue: `${stats.burnedPercent.toFixed(1)}% of supply`,
    },
    {
      label: "NFT Holdings",
      value: formatNumber(stats.holdingsCount),
      subValue: "GVC NFTs in pool",
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

function StatCard({
  label,
  value,
  subValue,
  change,
  highlight,
  animationDelay = 0,
}: StatCardProps) {
  const delayClass = `animate-delay-${animationDelay}`;

  return (
    <div className="relative">
      {/* Noise texture overlay */}
      <div className="absolute inset-0 bg-noise rounded-2xl opacity-100 pointer-events-none" />

      <div
        className={`relative bg-gvc-card rounded-2xl p-4 md:p-5 backdrop-blur-sm border transition-all animate-fade-in ${delayClass} ${
          highlight ? "border-gvc-primary/50" : "border-gvc-border"
        }`}
      >
        {/* Label */}
        <div className="mb-2">
          <span className="text-gvc-text-muted font-mundial text-xs uppercase tracking-wider">
            {label}
          </span>
        </div>

        {/* Main value */}
        <div className={`text-2xl md:text-3xl font-mundial font-bold tracking-wide ${highlight ? "text-gvc-primary" : "text-gvc-text"}`}>
          {value}
        </div>

        {/* Subtitle or change */}
        <div className="flex items-center gap-2 mt-1">
          {change !== undefined ? (
            <span
              className={`text-xs font-mundial ${
                change > 0
                  ? "text-gvc-green"
                  : change < 0
                    ? "text-gvc-red"
                    : "text-gvc-text-muted"
              }`}
            >
              {change > 0 ? "+" : ""}
              {subValue}
            </span>
          ) : subValue ? (
            <span className="text-gvc-text-muted text-xs font-mundial">
              {subValue}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
