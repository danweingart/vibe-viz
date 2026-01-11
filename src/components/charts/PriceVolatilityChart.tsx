"use client";

import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartStatCard, ChartStatGrid } from "@/components/ui";
import { StandardChartCard, LegendItem } from "@/components/charts/StandardChartCard";
import { usePriceHistory } from "@/hooks";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatEth, formatUsd, formatDate } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import { CHART_MARGINS, AXIS_STYLE, GRID_STYLE, getTooltipContentStyle } from "@/lib/chartConfig";
import { getChartFilename } from "@/lib/chartExport/index";

export function PriceVolatilityChart() {
  const { timeRange, currency } = useChartSettings();
  const { data, isLoading, error } = usePriceHistory(timeRange);

  // Track which series are visible
  const [visibleSeries, setVisibleSeries] = useState({
    high: true,
    low: true,
  });

  const handleLegendToggle = (key: string) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
  };

  const { chartData, avgVolatility, volatilityTrend } = useMemo(() => {
    if (!data || data.length === 0) {
      return { chartData: [], avgVolatility: 0, volatilityTrend: "stable" as const };
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
      volatilityTrend: trend,
    };
  }, [data, currency]);

  const trendConfig = {
    increasing: { color: CHART_COLORS.danger, icon: "↑", label: "Rising" },
    decreasing: { color: CHART_COLORS.success, icon: "↓", label: "Falling" },
    stable: { color: CHART_COLORS.muted, icon: "→", label: "Stable" },
  };

  const trend = trendConfig[volatilityTrend];

  // Legend items with active state
  const legendItems: LegendItem[] = [
    { key: "high", label: "7D Avg High", color: CHART_COLORS.success, active: visibleSeries.high },
    { key: "low", label: "7D Avg Low", color: CHART_COLORS.danger, active: visibleSeries.low },
  ];

  // Export configuration
  const exportConfig = useMemo(() => ({
    title: "Grail Activity",
    subtitle: `7-day rolling average of daily high/low prices over ${timeRange} days`,
    legend: [
      { color: CHART_COLORS.success, label: "7D Avg High", value: currency === "eth" ? "ETH" : "USD" },
      { color: CHART_COLORS.danger, label: "7D Avg Low", value: currency === "eth" ? "ETH" : "USD" },
    ],
    filename: getChartFilename("grail-activity", timeRange),
  }), [timeRange, currency]);

  return (
    <StandardChartCard
      title="Grail Activity"
      href="/charts/grail-activity"
      description="High-value sale activity with smoothed daily range"
      legend={legendItems}
      onLegendToggle={handleLegendToggle}
      exportConfig={exportConfig}
      isLoading={isLoading}
      error={error}
      isEmpty={!data || data.length === 0}
      emptyMessage="No data available"
      stats={
        <ChartStatGrid columns={2}>
          <ChartStatCard
            label="Avg Range"
            value={`${avgVolatility.toFixed(1)}%`}
          />
          <ChartStatCard
            label="Trend"
            value={`${trend.icon} ${trend.label}`}
          />
        </ChartStatGrid>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={CHART_MARGINS.default}>
          <defs>
            <linearGradient id="volatilityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.accent} stopOpacity={0.4} />
              <stop offset="50%" stopColor={CHART_COLORS.primary} stopOpacity={0.2} />
              <stop offset="100%" stopColor={CHART_COLORS.accent} stopOpacity={0.4} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray={GRID_STYLE.strokeDasharray} stroke={GRID_STYLE.stroke} vertical={GRID_STYLE.vertical} />
          <XAxis
            dataKey="date"
            stroke={AXIS_STYLE.stroke}
            fontSize={AXIS_STYLE.fontSize}
            fontFamily={AXIS_STYLE.fontFamily}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            interval={Math.max(0, Math.floor(chartData.length / 6) - 1)}
            tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          />
          <YAxis
            stroke={AXIS_STYLE.stroke}
            fontSize={AXIS_STYLE.fontSize}
            fontFamily={AXIS_STYLE.fontFamily}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            width={40}
            tickFormatter={(v) => currency === "eth" ? v.toFixed(2) : `$${v.toFixed(0)}`}
            domain={["dataMin", "dataMax"]}
          />
          <Tooltip
            contentStyle={getTooltipContentStyle()}
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
          {visibleSeries.high && (
            <Area
              type="monotone"
              dataKey="displayMaxMA"
              stroke={CHART_COLORS.success}
              strokeWidth={1.5}
              fill="url(#volatilityGradient)"
              fillOpacity={1}
            />
          )}
          {visibleSeries.low && (
            <Area
              type="monotone"
              dataKey="displayMinMA"
              stroke={CHART_COLORS.danger}
              strokeWidth={1.5}
              fill="#0a0a0a"
              fillOpacity={1}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </StandardChartCard>
  );
}
