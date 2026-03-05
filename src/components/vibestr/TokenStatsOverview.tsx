"use client";

import { StatCardSkeleton } from "@/components/ui/Skeleton";
import { useDexScreenerStats } from "@/hooks/vibestr/useDexScreenerStats";
import { useTokenStats } from "@/hooks/vibestr";
import { formatUsd, formatNumber, formatPercent } from "@/lib/utils";

export function TokenStatsOverview() {
  const { data: pair, isLoading: dexLoading, error: dexError } = useDexScreenerStats();
  const { data: stats, isLoading: statsLoading } = useTokenStats();

  const isLoading = dexLoading || statsLoading;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (dexError || !pair) {
    return (
      <div className="rounded-xl border border-gvc-red/50 bg-gvc-red/10 p-6 text-center">
        <p className="text-gvc-red">Failed to load token stats</p>
        <p className="text-gvc-text-muted text-xs mt-1">
          {dexError?.message || "No data available"}
        </p>
      </div>
    );
  }

  const price = parseFloat(pair.priceUsd);
  const priceChange24h = pair.priceChange.h24;
  const volume24h = pair.volume.h24;
  const liquidity = pair.liquidity.usd;
  const marketCap = pair.marketCap || pair.fdv;
  const buys24h = pair.txns.h24.buys;
  const sells24h = pair.txns.h24.sells;
  const buyRatio = buys24h + sells24h > 0
    ? (buys24h / (buys24h + sells24h)) * 100
    : 50;

  // Burn data from NFTStrategy API (fallback)
  const burnedAmount = stats?.burnedAmount || 0;
  const burnedPercent = stats?.burnedPercent || 0;

  const statsData = [
    {
      label: "Token Price",
      value: formatUsd(price, 6),
      subValue: formatPercent(priceChange24h),
      change: priceChange24h,
      highlight: true,
    },
    {
      label: "Market Cap",
      value: formatUsd(marketCap, 0),
      subValue: "fully diluted",
    },
    {
      label: "24h Volume",
      value: formatUsd(volume24h, 0),
      subValue: `${formatNumber(buys24h + sells24h)} txns`,
    },
    {
      label: "Liquidity",
      value: formatUsd(liquidity, 0),
      subValue: "available",
    },
    {
      label: "Buy/Sell Ratio",
      value: `${buyRatio.toFixed(0)}%`,
      subValue: `${buys24h}B / ${sells24h}S`,
      change: buyRatio > 50 ? 1 : buyRatio < 50 ? -1 : 0,
    },
    {
      label: "Burned",
      value: burnedAmount > 0 ? `${(burnedAmount / 1e6).toFixed(1)}M` : "—",
      subValue: burnedPercent > 0 ? `${burnedPercent.toFixed(1)}% of supply` : "loading...",
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
