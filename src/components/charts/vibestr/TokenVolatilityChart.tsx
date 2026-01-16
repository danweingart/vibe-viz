"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from "recharts";
import { ChartStatCard, ChartStatGrid } from "@/components/ui";
import {
  StandardChartCard,
  LegendItem,
} from "@/components/charts/StandardChartCard";
import { useTokenPriceHistory } from "@/hooks/vibestr";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatDate } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import {
  CHART_MARGINS,
  AXIS_STYLE,
  GRID_STYLE,
  getTooltipContentStyle,
} from "@/lib/chartConfig";
import { getChartFilename } from "@/lib/chartExport";

export function TokenVolatilityChart() {
  const { timeRange } = useChartSettings();
  const { data, isLoading, error } = useTokenPriceHistory(timeRange);

  // Track which series are visible
  const [visibleSeries, setVisibleSeries] = useState({
    volatility: true,
  });

  const handleLegendToggle = (key: string) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
  };

  // Calculate chart data
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data
      .filter((d) => d.volatility !== undefined)
      .map((d) => ({
        date: d.date,
        volatility: d.volatility || 0,
      }));
  }, [data]);

  // Calculate stats
  const currentVolatility = chartData[chartData.length - 1]?.volatility || 0;
  const avgVolatility =
    chartData.length > 0
      ? chartData.reduce((sum, d) => sum + d.volatility, 0) / chartData.length
      : 0;
  const maxVolatility = Math.max(...chartData.map((d) => d.volatility));

  // Determine trend (comparing recent vs earlier period)
  const midPoint = Math.floor(chartData.length / 2);
  const recentAvg =
    chartData.length > midPoint
      ? chartData
          .slice(midPoint)
          .reduce((sum, d) => sum + d.volatility, 0) /
        (chartData.length - midPoint)
      : 0;
  const earlierAvg =
    midPoint > 0
      ? chartData.slice(0, midPoint).reduce((sum, d) => sum + d.volatility, 0) /
        midPoint
      : 0;
  const trend = earlierAvg > 0 ? ((recentAvg - earlierAvg) / earlierAvg) * 100 : 0;

  // Legend items with active state
  const legendItems: LegendItem[] = [
    {
      key: "volatility",
      label: "Price Volatility",
      color: CHART_COLORS.accent,
      active: visibleSeries.volatility,
    },
  ];

  // Export configuration
  const exportConfig = useMemo(
    () => ({
      filename: getChartFilename("token-volatility", timeRange),
      title: "Token Volatility",
    }),
    [timeRange]
  );

  return (
    <StandardChartCard
      title="Token Volatility"
      description="Price volatility measured by 7-day standard deviation"
      legend={legendItems}
      onLegendToggle={handleLegendToggle}
      exportConfig={exportConfig}
      isLoading={isLoading}
      error={error}
      isEmpty={!data || data.length === 0}
      emptyMessage="No volatility data available"
      stats={
        <ChartStatGrid columns={3}>
          <ChartStatCard
            label="Current"
            value={`${currentVolatility.toFixed(1)}%`}
          />
          <ChartStatCard
            label={`${timeRange}D Average`}
            value={`${avgVolatility.toFixed(1)}%`}
          />
          <ChartStatCard
            label="Trend"
            value={`${trend > 0 ? "+" : ""}${trend.toFixed(1)}%`}
            change={trend}
          />
        </ChartStatGrid>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={CHART_MARGINS.default}>
          <defs>
            <linearGradient id="volatilityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.accent} stopOpacity={0.3} />
              <stop offset="95%" stopColor={CHART_COLORS.accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray={GRID_STYLE.strokeDasharray}
            stroke={GRID_STYLE.stroke}
            vertical={GRID_STYLE.vertical}
          />
          <XAxis
            dataKey="date"
            stroke={AXIS_STYLE.stroke}
            fontSize={AXIS_STYLE.fontSize}
            fontFamily={AXIS_STYLE.fontFamily}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            interval={Math.max(0, Math.floor(chartData.length / 6) - 1)}
            tickFormatter={(v) =>
              new Date(v).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            }
          />
          <YAxis
            stroke={AXIS_STYLE.stroke}
            fontSize={AXIS_STYLE.fontSize}
            fontFamily={AXIS_STYLE.fontFamily}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            width={40}
            tickFormatter={(v) => `${v.toFixed(0)}%`}
          />
          <Tooltip
            contentStyle={getTooltipContentStyle()}
            labelStyle={{ color: "#fafafa" }}
            formatter={(value) => [`${Number(value).toFixed(1)}%`]}
            labelFormatter={(label) => formatDate(label)}
          />
          {visibleSeries.volatility && (
            <>
              <Area
                type="monotone"
                dataKey="volatility"
                fill="url(#volatilityGradient)"
                stroke="none"
              />
              <Line
                type="monotone"
                dataKey="volatility"
                name="Volatility"
                stroke={CHART_COLORS.accent}
                strokeWidth={2}
                dot={false}
              />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </StandardChartCard>
  );
}
