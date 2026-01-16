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
import { useVolumeHistory } from "@/hooks/vibestr";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatUsd, formatDate } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import {
  CHART_MARGINS,
  AXIS_STYLE,
  GRID_STYLE,
  getTooltipContentStyle,
} from "@/lib/chartConfig";
import { getChartFilename } from "@/lib/chartExport";

export function CumulativeTradingVolumeChart() {
  const { timeRange } = useChartSettings();
  const { data, isLoading, error } = useVolumeHistory(timeRange);

  // Track which series are visible
  const [visibleSeries, setVisibleSeries] = useState({
    cumulative: true,
  });

  const handleLegendToggle = (key: string) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
  };

  // Calculate cumulative volume
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    let cumulative = 0;
    return data.map((d) => {
      cumulative += d.volumeUsd;
      return {
        date: d.date,
        cumulative,
      };
    });
  }, [data]);

  // Calculate stats
  const totalVolume = chartData[chartData.length - 1]?.cumulative || 0;
  const avgDailyVolume =
    chartData.length > 0 ? totalVolume / chartData.length : 0;

  // Calculate growth rate (comparing first half vs second half)
  const midPoint = Math.floor(chartData.length / 2);
  const firstHalfVolume =
    midPoint > 0 ? chartData[midPoint - 1]?.cumulative || 0 : 0;
  const secondHalfVolume = totalVolume - firstHalfVolume;
  const growthRate =
    firstHalfVolume > 0
      ? ((secondHalfVolume - firstHalfVolume) / firstHalfVolume) * 100
      : 0;

  // Legend items with active state
  const legendItems: LegendItem[] = [
    {
      key: "cumulative",
      label: "Cumulative Volume",
      color: CHART_COLORS.primary,
      active: visibleSeries.cumulative,
    },
  ];

  // Export configuration
  const exportConfig = useMemo(
    () => ({
      filename: getChartFilename("cumulative-volume", timeRange),
      title: "Cumulative Trading Volume",
    }),
    [timeRange]
  );

  return (
    <StandardChartCard
      title="Cumulative Trading Volume"
      description="Total trading volume accumulated over time"
      legend={legendItems}
      onLegendToggle={handleLegendToggle}
      exportConfig={exportConfig}
      isLoading={isLoading}
      error={error}
      isEmpty={!data || data.length === 0}
      emptyMessage="No volume data available"
      stats={
        <ChartStatGrid columns={3}>
          <ChartStatCard label="Total Volume" value={formatUsd(totalVolume, 0)} />
          <ChartStatCard
            label="Avg per Day"
            value={formatUsd(avgDailyVolume, 0)}
          />
          <ChartStatCard
            label="Growth Rate"
            value={`${growthRate > 0 ? "+" : ""}${growthRate.toFixed(1)}%`}
            change={growthRate}
          />
        </ChartStatGrid>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={CHART_MARGINS.default}>
          <defs>
            <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
              <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
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
            width={50}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
          />
          <Tooltip
            contentStyle={getTooltipContentStyle()}
            labelStyle={{ color: "#fafafa" }}
            formatter={(value) => [formatUsd(Number(value), 0), "Total Volume"]}
            labelFormatter={(label) => formatDate(label)}
          />
          {visibleSeries.cumulative && (
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke={CHART_COLORS.primary}
              strokeWidth={2}
              fill="url(#cumulativeGradient)"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </StandardChartCard>
  );
}
