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
} from "recharts";
import { ChartStatCard, ChartStatGrid } from "@/components/ui";
import {
  StandardChartCard,
  LegendItem,
} from "@/components/charts/StandardChartCard";
import { useVolumeHistory } from "@/hooks/vibestr";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatDate, formatNumber } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import {
  CHART_MARGINS,
  AXIS_STYLE,
  GRID_STYLE,
  getTooltipContentStyle,
  getAlignedTicks,} from "@/lib/chartConfig";
import { getChartFilename } from "@/lib/chartExport";

export function DailyActiveTradersChart() {
  const { timeRange } = useChartSettings();
  const { data, isLoading, error } = useVolumeHistory(timeRange);

  // Track which series are visible
  const [visibleSeries, setVisibleSeries] = useState({
    traders: true,
    ma7: true,
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

    // Estimate unique traders based on transaction count and volume
    return data.map((d, index) => {
      // Rough estimate: assume average transaction size and unique trader ratio
      const estimatedTraders = d.transactions > 0 ? Math.floor(d.transactions * 0.6) : 0;

      // Calculate 7-day moving average
      const startIndex = Math.max(0, index - 6);
      const slice = data.slice(startIndex, index + 1);
      const sum = slice.reduce((acc, s) => {
        const traders = s.transactions > 0 ? Math.floor(s.transactions * 0.6) : 0;
        return acc + traders;
      }, 0);
      const ma7 = sum / slice.length;

      return {
        date: d.date,
        traders: estimatedTraders,
        ma7,
      };
    });
  }, [data]);

  // Calculate stats
  const avgTraders = chartData.length > 0
    ? chartData.reduce((sum, d) => sum + d.traders, 0) / chartData.length
    : 0;
  const peakTraders = Math.max(...chartData.map((d) => d.traders));
  const peakDate = chartData.find((d) => d.traders === peakTraders)?.date || "";

  // Calculate growth rate
  const midPoint = Math.floor(chartData.length / 2);
  const firstHalf = chartData.slice(0, midPoint);
  const secondHalf = chartData.slice(midPoint);
  const firstAvg = firstHalf.length > 0
    ? firstHalf.reduce((sum, d) => sum + d.traders, 0) / firstHalf.length
    : 0;
  const secondAvg = secondHalf.length > 0
    ? secondHalf.reduce((sum, d) => sum + d.traders, 0) / secondHalf.length
    : 0;
  const growthRate = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;

  // Legend items with active state
  const legendItems: LegendItem[] = [
    {
      key: "traders",
      label: "Active Traders",
      color: CHART_COLORS.info,
      active: visibleSeries.traders,
    },
    {
      key: "ma7",
      label: "7D MA",
      color: CHART_COLORS.accent,
      active: visibleSeries.ma7,
      lineStyle: "dashed",
    },
  ];

  // Export configuration
  const exportConfig = useMemo(
    () => ({
      filename: getChartFilename("daily-traders", timeRange),
      title: "Daily Active Traders",
    }),
    [timeRange]
  );

  return (
    <StandardChartCard
      title="Daily Active Traders (Est.)"
      description="Estimated unique traders (~60% of transactions) - actual data requires on-chain analysis"
      legend={legendItems}
      onLegendToggle={handleLegendToggle}
      exportConfig={exportConfig}
      isLoading={isLoading}
      error={error}
      isEmpty={!data || data.length === 0}
      emptyMessage="No trader data available"
      stats={
        <ChartStatGrid columns={3}>
          <ChartStatCard label="Avg Daily" value={formatNumber(avgTraders)} />
          <ChartStatCard label="Peak Day" value={formatNumber(peakTraders)} />
          <ChartStatCard
            label="Growth"
            value={`${growthRate > 0 ? "+" : ""}${growthRate.toFixed(1)}%`}
            change={growthRate}
          />
        </ChartStatGrid>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={CHART_MARGINS.default}>
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
            ticks={getAlignedTicks(chartData.map(d => d.date), 6)}
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
          />
          <Tooltip
            contentStyle={getTooltipContentStyle()}
            labelStyle={{ color: "#ffffff" }}
            formatter={(value) => [formatNumber(Number(value))]}
            labelFormatter={(label) => formatDate(label)}
          />
          {visibleSeries.traders && (
            <Line
              type="monotone"
              dataKey="traders"
              name="Traders"
              stroke={CHART_COLORS.info}
              strokeWidth={2}
              dot={false}
            />
          )}
          {visibleSeries.ma7 && (
            <Line
              type="monotone"
              dataKey="ma7"
              name="7D MA"
              stroke={CHART_COLORS.accent}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </StandardChartCard>
  );
}
