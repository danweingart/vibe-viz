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
import {
  StandardChartCard,
  LegendItem,
} from "@/components/charts/StandardChartCard";
import { useVolumeHistory, useTokenStats } from "@/hooks/vibestr";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatDate, formatNumber } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import {
  CHART_MARGINS,
  AXIS_STYLE,
  GRID_STYLE,
  getTooltipContentStyle,
} from "@/lib/chartConfig";
import { getChartFilename } from "@/lib/chartExport";

export function HolderActivityChart() {
  const { timeRange } = useChartSettings();
  const { data, isLoading, error } = useVolumeHistory(timeRange);
  const { data: stats } = useTokenStats();

  // Track which series are visible
  const [visibleSeries, setVisibleSeries] = useState({
    whales: true,
    medium: true,
    small: true,
  });

  const handleLegendToggle = (key: string) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
  };

  // Calculate activity by holder size
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.map((d) => {
      const totalActivity = d.transactions;

      // Simulate distribution: Whales (20%), Medium (30%), Small (50%)
      const whaleActivity = Math.floor(totalActivity * 0.2);
      const mediumActivity = Math.floor(totalActivity * 0.3);
      const smallActivity = totalActivity - whaleActivity - mediumActivity;

      return {
        date: d.date,
        whales: whaleActivity,
        medium: mediumActivity,
        small: smallActivity,
      };
    });
  }, [data]);

  // Calculate stats
  const totalActivity = chartData.reduce((sum, d) => sum + d.whales + d.medium + d.small, 0);
  const whalePercent = totalActivity > 0
    ? (chartData.reduce((sum, d) => sum + d.whales, 0) / totalActivity) * 100
    : 0;

  // Calculate net flow direction (simplified)
  const recentActivity = chartData.slice(-7);
  const olderActivity = chartData.slice(0, 7);
  const recentSum = recentActivity.reduce((sum, d) => sum + d.whales + d.medium + d.small, 0);
  const olderSum = olderActivity.reduce((sum, d) => sum + d.whales + d.medium + d.small, 0);
  const netFlow = recentSum > olderSum ? "Increasing" : recentSum < olderSum ? "Decreasing" : "Stable";

  // Legend items with active state
  const legendItems: LegendItem[] = [
    {
      key: "whales",
      label: "Whales (>100K)",
      color: CHART_COLORS.danger,
      active: visibleSeries.whales,
    },
    {
      key: "medium",
      label: "Medium (10K-100K)",
      color: CHART_COLORS.accent,
      active: visibleSeries.medium,
    },
    {
      key: "small",
      label: "Small (<10K)",
      color: CHART_COLORS.info,
      active: visibleSeries.small,
    },
  ];

  // Export configuration
  const exportConfig = useMemo(
    () => ({
      filename: getChartFilename("holder-activity", timeRange),
      title: "Holder Activity",
    }),
    [timeRange]
  );

  return (
    <StandardChartCard
      title="Holder Activity (Simulated)"
      description="Illustrative activity distribution by holder size - actual data requires on-chain wallet analysis"
      legend={legendItems}
      onLegendToggle={handleLegendToggle}
      exportConfig={exportConfig}
      isLoading={isLoading}
      error={error}
      isEmpty={!data || data.length === 0}
      emptyMessage="No holder activity data available"
      stats={
        <ChartStatGrid columns={3}>
          <ChartStatCard
            label="Whale Activity"
            value={`${whalePercent.toFixed(0)}%`}
          />
          <ChartStatCard label="Net Flow" value={netFlow} />
          <ChartStatCard
            label="Total Holders"
            value={formatNumber(stats?.holdingsCount || 0)}
          />
        </ChartStatGrid>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={CHART_MARGINS.default}>
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
          />
          <Tooltip
            contentStyle={getTooltipContentStyle()}
            labelStyle={{ color: "#fafafa" }}
            formatter={(value, name) => [formatNumber(Number(value)), name]}
            labelFormatter={(label) => formatDate(label)}
          />
          {visibleSeries.small && (
            <Area
              type="monotone"
              dataKey="small"
              stackId="1"
              stroke={CHART_COLORS.info}
              fill={CHART_COLORS.info}
              fillOpacity={0.6}
            />
          )}
          {visibleSeries.medium && (
            <Area
              type="monotone"
              dataKey="medium"
              stackId="1"
              stroke={CHART_COLORS.accent}
              fill={CHART_COLORS.accent}
              fillOpacity={0.6}
            />
          )}
          {visibleSeries.whales && (
            <Area
              type="monotone"
              dataKey="whales"
              stackId="1"
              stroke={CHART_COLORS.danger}
              fill={CHART_COLORS.danger}
              fillOpacity={0.6}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </StandardChartCard>
  );
}
