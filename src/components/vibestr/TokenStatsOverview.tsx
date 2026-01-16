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
    <Card
      className={`relative overflow-hidden animate-fade-in p-4 ${delayClass} ${
        highlight ? "border-brand/40 brand-glow-pulse" : "hover:border-border-light"
      }`}
    >
      <div className="space-y-2">
        {/* Label */}
        <div className="text-[10px] sm:text-xs text-foreground-muted font-medium uppercase tracking-wide">
          {label}
        </div>

        {/* Value */}
        <div
          className={`text-lg sm:text-xl md:text-2xl font-mundial-bold ${
            highlight ? "text-brand" : "text-foreground"
          } tracking-tight`}
        >
          {value}
        </div>

        {/* Sub Value or Change */}
        {(subValue || change !== undefined) && (
          <div className="flex items-center gap-2">
            {change !== undefined ? (
              <span
                className={`text-xs font-medium ${
                  change > 0
                    ? "text-chart-success"
                    : change < 0
                      ? "text-chart-danger"
                      : "text-foreground-muted"
                }`}
              >
                {change > 0 ? "+" : ""}
                {subValue}
              </span>
            ) : (
              <span className="text-[10px] sm:text-xs text-foreground-muted/80">
                {subValue}
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
