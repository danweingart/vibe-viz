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
  ReferenceLine,
} from "recharts";
import Link from "next/link";
import { Card, CardHeader, CardDescription } from "@/components/ui";
import { ChartExportButtons } from "./ChartExportButtons";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { usePriceHistory } from "@/hooks";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatEth, formatUsd, formatDate } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";

export function PriceVolatilityChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const { timeRange, currency } = useChartSettings();
  const { data, isLoading, error } = usePriceHistory(timeRange);

  const exportConfig = useMemo(() => ({
    title: "Grail Activity",
    subtitle: `7-day rolling average of daily high/low prices over ${timeRange} days`,
    legend: [
      { color: CHART_COLORS.success, label: "7D Avg High", value: currency === "eth" ? "ETH" : "USD" },
      { color: CHART_COLORS.danger, label: "7D Avg Low", value: currency === "eth" ? "ETH" : "USD" },
    ],
    filename: getChartFilename("grail-activity", timeRange),
  }), [timeRange, currency]);

  const { chartData, avgVolatility, maxVolatility, volatilityTrend } = useMemo(() => {
    if (!data || data.length === 0) {
      return { chartData: [], avgVolatility: 0, maxVolatility: 0, volatilityTrend: "stable" as const };
    }

    // Calculate daily price range and volatility percentage
    const processedData = data.map((d, i) => {
      const range = d.maxPrice - d.minPrice;
      const volatilityPct = d.minPrice > 0 ? (range / d.minPrice) * 100 : 0;
      const displayMin = currency === "eth" ? d.minPrice : d.minPrice * d.ethPrice;
      const displayMax = currency === "eth" ? d.maxPrice : d.maxPrice * d.ethPrice;
      const displayRange = displayMax - displayMin;

      // Calculate 7-day rolling average for min and max
      const slice = data.slice(Math.max(0, i - 6), i + 1);
      const avgMin = slice.reduce((sum, s) => sum + (currency === "eth" ? s.minPrice : s.minPrice * s.ethPrice), 0) / slice.length;
      const avgMax = slice.reduce((sum, s) => sum + (currency === "eth" ? s.maxPrice : s.maxPrice * s.ethPrice), 0) / slice.length;

      return {
        ...d,
        range,
        volatilityPct,
        displayMin,
        displayMax,
        displayRange,
        displayAvg: (displayMin + displayMax) / 2,
        // 7-day rolling averages
        displayMinMA: avgMin,
        displayMaxMA: avgMax,
      };
    });

    const avgVol = processedData.reduce((sum, d) => sum + d.volatilityPct, 0) / processedData.length;
    const maxVol = Math.max(...processedData.map((d) => d.volatilityPct));

    // Calculate trend (compare recent 7 days to previous 7 days)
    const recent = processedData.slice(-7);
    const previous = processedData.slice(-14, -7);
    const recentAvg = recent.length > 0
      ? recent.reduce((sum, d) => sum + d.volatilityPct, 0) / recent.length
      : 0;
    const previousAvg = previous.length > 0
      ? previous.reduce((sum, d) => sum + d.volatilityPct, 0) / previous.length
      : 0;

    let trend: "increasing" | "decreasing" | "stable" = "stable";
    if (previousAvg > 0) {
      const change = (recentAvg - previousAvg) / previousAvg;
      if (change > 0.2) trend = "increasing";
      else if (change < -0.2) trend = "decreasing";
    }

    return {
      chartData: processedData,
      avgVolatility: avgVol,
      maxVolatility: maxVol,
      volatilityTrend: trend,
    };
  }, [data, currency]);

  if (isLoading) return <ChartSkeleton />;
  if (error || !data || data.length === 0) {
    return (
      <Card>
        <CardHeader><span className="text-lg font-bold font-brice">Grail Activity</span></CardHeader>
        <p className="text-foreground-muted text-center py-8">No data available</p>
      </Card>
    );
  }

  const trendConfig = {
    increasing: { color: CHART_COLORS.danger, icon: "↑", label: "Rising" },
    decreasing: { color: CHART_COLORS.success, icon: "↓", label: "Falling" },
    stable: { color: CHART_COLORS.muted, icon: "→", label: "Stable" },
  };

  const trend = trendConfig[volatilityTrend];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <Link href="/charts/grail-activity" className="text-lg font-bold text-foreground font-brice hover:text-brand transition-colors">
            Grail Activity
          </Link>
          <p className="export-branding text-sm text-brand font-mundial">Good Vibes Club</p>
          <CardDescription>Moving avg of daily high/low over 7 days (wider = higher premium activity)</CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-3 text-right text-xs">
            <div>
              <p className="font-bold text-chart-accent">{avgVolatility.toFixed(1)}%</p>
              <p className="text-foreground-muted">Avg Range</p>
            </div>
            <div>
              <p className="font-bold" style={{ color: trend.color }}>
                {trend.icon} {trend.label}
              </p>
              <p className="text-foreground-muted">Trend</p>
            </div>
          </div>
          <ChartExportButtons chartRef={chartRef} config={exportConfig} />
        </div>
      </CardHeader>

      <div ref={chartRef} className="px-1 pt-1 bg-background-secondary rounded-lg chart-container flex-1 flex flex-col">
        <div className="flex-1 min-h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 8, left: -5, bottom: 0 }}>
              <defs>
                <linearGradient id="volatilityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.accent} stopOpacity={0.4} />
                  <stop offset="50%" stopColor={CHART_COLORS.primary} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={CHART_COLORS.accent} stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="date"
                stroke="#71717a"
                fontSize={11}
                fontFamily="var(--font-mundial)"
                axisLine={false}
                tickLine={false}
                interval={Math.max(0, Math.floor(chartData.length / 6) - 1)}
                tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              />
              <YAxis
                stroke="#71717a"
                fontSize={11}
                fontFamily="var(--font-mundial)"
                axisLine={false}
                tickLine={false}
                width={40}
                tickFormatter={(v) => currency === "eth" ? v.toFixed(2) : `$${v.toFixed(0)}`}
                domain={["dataMin", "dataMax"]}
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
                      <p className="text-chart-success">
                        7D Avg High: {currency === "eth" ? formatEth(d.displayMaxMA, 3) : formatUsd(d.displayMaxMA)}
                      </p>
                      <p className="text-chart-danger">
                        7D Avg Low: {currency === "eth" ? formatEth(d.displayMinMA, 3) : formatUsd(d.displayMinMA)}
                      </p>
                      <p className="text-chart-accent">
                        Daily Range: {d.volatilityPct.toFixed(1)}%
                      </p>
                    </div>
                  );
                }}
              />
              {/* Price band - 7-day rolling average */}
              <Area
                type="monotone"
                dataKey="displayMaxMA"
                stroke={CHART_COLORS.success}
                strokeWidth={1.5}
                fill="url(#volatilityGradient)"
                fillOpacity={1}
              />
              <Area
                type="monotone"
                dataKey="displayMinMA"
                stroke={CHART_COLORS.danger}
                strokeWidth={1.5}
                fill="#0a0a0a"
                fillOpacity={1}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 mt-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 rounded" style={{ backgroundColor: CHART_COLORS.success }} />
            <span className="text-foreground-muted">7D Avg High</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 rounded" style={{ backgroundColor: CHART_COLORS.danger }} />
            <span className="text-foreground-muted">7D Avg Low</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded opacity-30" style={{ backgroundColor: CHART_COLORS.accent }} />
            <span className="text-foreground-muted">Rolling Band</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
