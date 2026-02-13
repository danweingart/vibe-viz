"use client";

import { useMemo, useState } from "react";
import {
  ComposedChart,
  Bar,
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
import { formatUsd, formatDate, formatNumber } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import {
  CHART_MARGINS,
  AXIS_STYLE,
  GRID_STYLE,
  getTooltipContentStyle,
  getAlignedTicks,} from "@/lib/chartConfig";
import { getChartFilename } from "@/lib/chartExport";

export function TradingVolumeChart() {
  const { timeRange } = useChartSettings();
  const { data, isLoading, error } = useVolumeHistory(timeRange);

  // Track which series are visible
  const [visibleSeries, setVisibleSeries] = useState({
    volume: true,
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

    return data.map((d) => ({
      date: d.date,
      volume: d.volumeUsd,
      ma7: d.movingAverage7 || 0,
      transactions: d.transactions,
    }));
  }, [data]);

  // Calculate stats
  const totalVolume = chartData.reduce((sum, d) => sum + d.volume, 0);
  const avgVolume =
    chartData.length > 0 ? totalVolume / chartData.length : 0;
  const volume24h = chartData[chartData.length - 1]?.volume || 0;

  // Legend items with active state
  const legendItems: LegendItem[] = [
    {
      key: "volume",
      label: "Volume",
      color: CHART_COLORS.primary,
      active: visibleSeries.volume,
    },
    {
      key: "ma7",
      label: "7D MA",
      color: CHART_COLORS.info,
      active: visibleSeries.ma7,
      lineStyle: "solid",
    },
  ];

  // Export configuration
  const exportConfig = useMemo(
    () => ({
      filename: getChartFilename("trading-volume", timeRange),
      title: "Trading Volume",
    }),
    [timeRange]
  );

  return (
    <StandardChartCard
      title="Trading Volume"
      description="24h trading volume with 7-day moving average"
      legend={legendItems}
      onLegendToggle={handleLegendToggle}
      exportConfig={exportConfig}
      isLoading={isLoading}
      error={error}
      isEmpty={!data || data.length === 0}
      emptyMessage="No volume data available"
      stats={
        <ChartStatGrid columns={3}>
          <ChartStatCard label="24h Volume" value={formatUsd(volume24h, 0)} />
          <ChartStatCard
            label={`${timeRange}D Total`}
            value={formatUsd(totalVolume, 0)}
          />
          <ChartStatCard label="Avg per Day" value={formatUsd(avgVolume, 0)} />
        </ChartStatGrid>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={CHART_MARGINS.default}>
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
            width={50}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
          />
          <Tooltip
            contentStyle={getTooltipContentStyle()}
            labelStyle={{ color: "#ffffff" }}
            formatter={(value, name) => {
              if (name === "Volume") return [formatUsd(Number(value), 0)];
              if (name === "7D MA") return [formatUsd(Number(value), 0)];
              return [value];
            }}
            labelFormatter={(label) => formatDate(label)}
          />
          {visibleSeries.volume && (
            <Bar
              dataKey="volume"
              name="Volume"
              fill={CHART_COLORS.primary}
              radius={[4, 4, 0, 0]}
            />
          )}
          {visibleSeries.ma7 && (
            <Line
              type="monotone"
              dataKey="ma7"
              name="7D MA"
              stroke={CHART_COLORS.info}
              strokeWidth={2}
              dot={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </StandardChartCard>
  );
}
