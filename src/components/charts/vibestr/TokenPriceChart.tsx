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
import { formatUsd, formatDate } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import {
  CHART_MARGINS,
  AXIS_STYLE,
  GRID_STYLE,
  getTooltipContentStyle,
  getAlignedTicks,} from "@/lib/chartConfig";
import { getChartFilename } from "@/lib/chartExport";

export function TokenPriceChart() {
  const { timeRange } = useChartSettings();
  const { data, isLoading, error } = useTokenPriceHistory(timeRange);

  // Track which series are visible
  const [visibleSeries, setVisibleSeries] = useState({
    price: true,
    ma7: true,
  });

  const handleLegendToggle = (key: string) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
  };

  // Calculate chart data with moving average
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.map((d) => ({
      date: d.date,
      price: d.priceUsd,
      ma7: d.movingAverage7 || 0,
    }));
  }, [data]);

  // Calculate stats
  const currentPrice = chartData[chartData.length - 1]?.price || 0;
  const avgPrice =
    chartData.length > 0
      ? chartData.reduce((sum, d) => sum + d.price, 0) / chartData.length
      : 0;
  const priceChange = data?.[data.length - 1]?.priceChange || 0;

  // Legend items with active state
  const legendItems: LegendItem[] = [
    {
      key: "price",
      label: "Token Price",
      color: CHART_COLORS.primary,
      active: visibleSeries.price,
    },
    {
      key: "ma7",
      label: "7D MA",
      color: CHART_COLORS.info,
      active: visibleSeries.ma7,
      lineStyle: "dashed",
    },
  ];

  // Export configuration
  const exportConfig = useMemo(
    () => ({
      filename: getChartFilename("token-price", timeRange),
      title: "Token Price",
    }),
    [timeRange]
  );

  return (
    <StandardChartCard
      title="Token Price"
      description="VIBESTR token price with 7-day moving average"
      legend={legendItems}
      onLegendToggle={handleLegendToggle}
      exportConfig={exportConfig}
      isLoading={isLoading}
      error={error}
      isEmpty={!data || data.length === 0}
      emptyMessage="No price data available"
      stats={
        <ChartStatGrid columns={3}>
          <ChartStatCard label="Current Price" value={formatUsd(currentPrice, 4)} />
          <ChartStatCard
            label="24h Change"
            value={`${priceChange > 0 ? "+" : ""}${priceChange.toFixed(2)}%`}
            change={priceChange}
          />
          <ChartStatCard
            label={`${timeRange}D Average`}
            value={formatUsd(avgPrice, 4)}
          />
        </ChartStatGrid>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={CHART_MARGINS.default}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
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
            tickFormatter={(v) => `$${v.toFixed(4)}`}
          />
          <Tooltip
            contentStyle={getTooltipContentStyle()}
            labelStyle={{ color: "#ffffff" }}
            formatter={(value) => [formatUsd(Number(value), 4)]}
            labelFormatter={(label) => formatDate(label)}
          />
          {visibleSeries.price && (
            <>
              <Area
                type="monotone"
                dataKey="price"
                fill="url(#priceGradient)"
                stroke="none"
              />
              <Line
                type="monotone"
                dataKey="price"
                name="Price"
                stroke={CHART_COLORS.primary}
                strokeWidth={2}
                dot={false}
              />
            </>
          )}
          {visibleSeries.ma7 && (
            <Line
              type="monotone"
              dataKey="ma7"
              name="7D MA"
              stroke={CHART_COLORS.info}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </StandardChartCard>
  );
}
