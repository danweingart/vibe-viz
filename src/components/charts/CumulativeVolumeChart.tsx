"use client";

import { useRef, useMemo } from "react";
import { getChartFilename } from "@/lib/chartExport/index";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Link from "next/link";
import { Card } from "@/components/ui";
import { ChartExportButtons } from "./ChartExportButtons";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { usePriceHistory } from "@/hooks";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatEth, formatUsd, formatDate } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";

export function CumulativeVolumeChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const { timeRange, currency } = useChartSettings();
  const { data, isLoading, error } = usePriceHistory(timeRange);

  const exportConfig = useMemo(() => ({
    title: "Cumulative Volume",
    subtitle: `Running total over ${timeRange} days (${currency.toUpperCase()})`,
    legend: [
      { color: CHART_COLORS.primary, label: "Cumulative Volume", value: currency === "eth" ? "ETH" : "USD" },
    ],
    filename: getChartFilename("cumulative-volume", timeRange),
  }), [timeRange, currency]);

  const { chartData, totalVolume, dailyAvg, growthRate } = useMemo(() => {
    if (!data || data.length === 0) {
      return { chartData: [], totalVolume: 0, dailyAvg: 0, growthRate: 0 };
    }

    // Calculate cumulative volume
    let cumulative = 0;
    let cumulativeUsd = 0;
    const processed = data.map((d) => {
      cumulative += d.volume;
      cumulativeUsd += d.volumeUsd;
      return {
        ...d,
        cumulative,
        cumulativeUsd,
        displayCumulative: currency === "eth" ? cumulative : cumulativeUsd,
        displayDaily: currency === "eth" ? d.volume : d.volumeUsd,
      };
    });

    const total = currency === "eth" ? cumulative : cumulativeUsd;
    const avg = total / data.length;

    // Calculate growth rate (comparing daily average in 2nd half vs 1st half)
    const midpoint = Math.floor(data.length / 2);
    const firstHalfDays = processed.slice(0, midpoint);
    const secondHalfDays = processed.slice(midpoint);
    const firstHalfAvg = firstHalfDays.length > 0
      ? firstHalfDays.reduce((sum, d) => sum + d.displayDaily, 0) / firstHalfDays.length
      : 0;
    const secondHalfAvg = secondHalfDays.length > 0
      ? secondHalfDays.reduce((sum, d) => sum + d.displayDaily, 0) / secondHalfDays.length
      : 0;
    const growth = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;

    return {
      chartData: processed,
      totalVolume: total,
      dailyAvg: avg,
      growthRate: growth,
    };
  }, [data, currency]);

  if (isLoading) return <ChartSkeleton />;
  if (error || !data || data.length === 0) {
    return (
      <Card>
        <div className="p-6">
          <span className="text-lg font-bold font-brice">Cumulative Volume</span>
          <p className="text-foreground-muted text-center py-8">No data available</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      {/* Exportable content */}
      <div ref={chartRef} className="px-1 pt-1 bg-background-secondary rounded-lg chart-container flex-1 flex flex-col">
        {/* Header with title and metrics */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <Link href="/charts/cumulative-volume" className="text-lg font-bold text-foreground font-brice hover:text-brand transition-colors">
              Cumulative Volume
            </Link>
            <p className="export-branding text-sm text-brand font-mundial">Good Vibes Club</p>
            <p className="text-sm text-foreground-muted">
              Running total over {timeRange} days ({currency.toUpperCase()})
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex gap-3 text-right text-xs">
              <div>
                <p className="font-bold text-brand">
                  {currency === "eth" ? formatEth(totalVolume, 1) : formatUsd(totalVolume)}
                </p>
                <p className="text-foreground-muted text-[10px]">Total</p>
              </div>
              <div>
                <p className="font-bold text-chart-info">
                  {currency === "eth" ? formatEth(dailyAvg, 2) : formatUsd(dailyAvg)}
                </p>
                <p className="text-foreground-muted text-[10px]">Daily Avg</p>
              </div>
              <div>
                <p
                  className="font-bold"
                  style={{ color: growthRate > 0 ? CHART_COLORS.success : growthRate < 0 ? CHART_COLORS.danger : CHART_COLORS.muted }}
                >
                  {growthRate > 0 ? "+" : ""}{growthRate.toFixed(0)}%
                </p>
                <p className="text-foreground-muted text-[10px]">Velocity Δ</p>
              </div>
            </div>
            <ChartExportButtons chartRef={chartRef} config={exportConfig} />
          </div>
        </div>

        {/* Chart - minimal margins */}
        <div className="flex-1 min-h-[120px] sm:min-h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 8, left: -5, bottom: 0 }}>
              <defs>
                <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.6} />
                  <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="date"
                stroke="#71717a"
                fontSize={11}
                fontFamily="var(--font-mundial)"
                interval={Math.max(0, Math.floor(chartData.length / 6) - 1) || 0}
                tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                stroke="#71717a"
                fontSize={11}
                fontFamily="var(--font-mundial)"
                width={40}
                tickFormatter={(v) => currency === "eth" ? `${(v).toFixed(0)}` : `$${(v / 1000).toFixed(0)}k`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "#141414", border: "1px solid #27272a", borderRadius: "8px" }}
                labelStyle={{ color: "#fafafa" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length || !label) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div className="bg-background-secondary border border-border rounded-lg p-2 text-xs">
                      <p className="font-bold text-foreground">{formatDate(String(label))}</p>
                      <p className="text-brand">
                        Cumulative: {currency === "eth" ? formatEth(d.displayCumulative, 2) : formatUsd(d.displayCumulative)}
                      </p>
                      <p className="text-foreground-muted">
                        Daily: +{currency === "eth" ? formatEth(d.displayDaily, 2) : formatUsd(d.displayDaily)}
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="displayCumulative"
                stroke={CHART_COLORS.primary}
                strokeWidth={2}
                fill="url(#cumulativeGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-5 mt-2 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded" style={{ backgroundColor: CHART_COLORS.primary }} />
            <span className="text-foreground-muted">Cumulative Volume</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
