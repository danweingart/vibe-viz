"use client";

import { useMemo } from "react";
import { StandardChartCard } from "@/components/charts/StandardChartCard";
import { useRealtimeBurn } from "@/hooks/vibestr";
import { formatNumber } from "@/lib/utils";
import { getChartFilename } from "@/lib/chartExport";

export function BurnMetricsChart() {
  const { data, isLoading, error } = useRealtimeBurn();

  // Export configuration
  const exportConfig = useMemo(
    () => ({
      filename: getChartFilename("realtime-burn-metrics"),
      title: "Real-Time Burn Metrics",
    }),
    []
  );

  return (
    <StandardChartCard
      title="Real-Time Burn Metrics"
      description="Live blockchain data updated every 60 seconds"
      exportConfig={exportConfig}
      isLoading={isLoading}
      error={error}
      isEmpty={!data}
      emptyMessage="No burn data available"
    >
      <div className="grid grid-cols-2 gap-4">
        {/* Total Burned */}
        <div className="bg-background-tertiary rounded-lg p-4 border border-border">
          <div className="flex items-start justify-between mb-2">
            <span className="text-xs text-foreground-muted uppercase tracking-wider">
              Total Burned
            </span>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-danger animate-pulse" />
              <span className="text-[10px] font-mono text-danger uppercase">
                LIVE
              </span>
            </div>
          </div>
          <div className="text-2xl font-brice text-danger">
            {data ? `${(data.burned / 1e9).toFixed(1)}B` : "—"}
          </div>
          <div className="text-xs text-foreground-muted mt-1">
            {data ? formatNumber(data.burned) : "—"}
          </div>
        </div>

        {/* Burn Percentage */}
        <div className="bg-background-tertiary rounded-lg p-4 border border-border">
          <div className="text-xs text-foreground-muted uppercase tracking-wider mb-2">
            Burn Percentage
          </div>
          <div className="text-2xl font-brice text-danger">
            {data ? `${data.burnPercentage.toFixed(2)}%` : "—"}
          </div>
          <div className="text-xs text-foreground-muted mt-1">
            of total supply
          </div>
        </div>

        {/* Circulating Supply */}
        <div className="bg-background-tertiary rounded-lg p-4 border border-border">
          <div className="text-xs text-foreground-muted uppercase tracking-wider mb-2">
            Circulating Supply
          </div>
          <div className="text-2xl font-brice text-foreground">
            {data ? `${(data.circulatingSupply / 1e9).toFixed(1)}B` : "—"}
          </div>
          <div className="text-xs text-foreground-muted mt-1">
            {data ? formatNumber(data.circulatingSupply) : "—"}
          </div>
        </div>

        {/* Total Supply */}
        <div className="bg-background-tertiary rounded-lg p-4 border border-border">
          <div className="text-xs text-foreground-muted uppercase tracking-wider mb-2">
            Total Supply
          </div>
          <div className="text-2xl font-brice text-foreground">
            {data ? `${(data.totalSupply / 1e9).toFixed(1)}B` : "—"}
          </div>
          <div className="text-xs text-foreground-muted mt-1">
            1 trillion max
          </div>
        </div>
      </div>

      {/* Last Updated Timestamp */}
      {data && (
        <div className="mt-4 pt-3 border-t border-border">
          <div className="text-xs text-foreground-muted text-center">
            Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
          </div>
        </div>
      )}
    </StandardChartCard>
  );
}
