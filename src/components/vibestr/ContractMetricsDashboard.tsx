"use client";

import { Card } from "@/components/ui";
import { StatCardSkeleton } from "@/components/ui/Skeleton";
import { useContractMetrics } from "@/hooks/vibestr";
import { formatEth, formatNumber, formatPercent } from "@/lib/utils";

export function ContractMetricsDashboard() {
  const { data: metrics, isLoading, error } = useContractMetrics();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error || !metrics || 'error' in metrics) {
    return (
      <div className="rounded-xl border border-chart-danger/50 bg-chart-danger/10 p-6 text-center">
        <p className="text-chart-danger">
          Failed to load contract metrics. Please run blockchain sync first.
        </p>
      </div>
    );
  }

  const statsData = [
    {
      label: "Total Value Locked",
      value: formatEth(metrics.totalValueLocked),
      subValue: `${metrics.currentNFTsHeld} NFTs held`,
      highlight: true,
    },
    {
      label: "Total Proceeds",
      value: formatEth(metrics.totalProceedsGenerated),
      subValue: `from ${metrics.totalNFTsSold} sales`,
    },
    {
      label: "Total Invested",
      value: formatEth(metrics.totalInvested),
      subValue: `${metrics.totalNFTsPurchased} purchases`,
    },
    {
      label: "ROI",
      value: formatPercent(metrics.roi),
      subValue: "return on investment",
      change: metrics.roi,
    },
    {
      label: "Burn Efficiency",
      value: formatPercent(metrics.burnEfficiency),
      subValue: `${(metrics.totalTokensBurned / 1e9).toFixed(1)}B burned`,
    },
    {
      label: "Avg Hold Time",
      value: `${metrics.averageHoldTime.toFixed(1)}d`,
      subValue: "days per NFT",
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
