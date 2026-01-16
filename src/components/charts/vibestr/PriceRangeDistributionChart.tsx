"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
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
import { useTokenPriceHistory } from "@/hooks/vibestr";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatUsd } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import {
  CHART_MARGINS,
  AXIS_STYLE,
  GRID_STYLE,
  getTooltipContentStyle,
} from "@/lib/chartConfig";
import { getChartFilename } from "@/lib/chartExport";

export function PriceRangeDistributionChart() {
  const { timeRange } = useChartSettings();
  const { data, isLoading, error } = useTokenPriceHistory(timeRange);

  // Track which series are visible
  const [visibleSeries, setVisibleSeries] = useState({
    frequency: true,
  });

  const handleLegendToggle = (key: string) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
  };

  // Calculate price distribution histogram
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Get price range
    const prices = data.map((d) => d.priceUsd);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const range = maxPrice - minPrice;

    // Create 10 buckets
    const bucketCount = 10;
    const bucketSize = range / bucketCount;

    // Initialize buckets
    const buckets = Array.from({ length: bucketCount }, (_, i) => ({
      min: minPrice + i * bucketSize,
      max: minPrice + (i + 1) * bucketSize,
      count: 0,
      label: `$${(minPrice + i * bucketSize).toFixed(4)}`,
    }));

    // Fill buckets
    prices.forEach((price) => {
      const bucketIndex = Math.min(
        Math.floor((price - minPrice) / bucketSize),
        bucketCount - 1
      );
      buckets[bucketIndex].count++;
    });

    return buckets;
  }, [data]);

  // Calculate stats
  const prices = data?.map((d) => d.priceUsd) || [];
  const sortedPrices = [...prices].sort((a, b) => a - b);
  const median = sortedPrices.length > 0
    ? sortedPrices[Math.floor(sortedPrices.length / 2)]
    : 0;

  // Find mode (most common price range)
  const modeRange = chartData.reduce(
    (max, bucket) => (bucket.count > max.count ? bucket : max),
    chartData[0] || { count: 0, label: "N/A" }
  );

  // Legend items with active state
  const legendItems: LegendItem[] = [
    {
      key: "frequency",
      label: "Days in Range",
      color: CHART_COLORS.primary,
      active: visibleSeries.frequency,
    },
  ];

  // Export configuration
  const exportConfig = useMemo(
    () => ({
      filename: getChartFilename("price-distribution", timeRange),
      title: "Price Range Distribution",
    }),
    [timeRange]
  );

  return (
    <StandardChartCard
      title="Price Range Distribution"
      description="Frequency of prices across different ranges"
      legend={legendItems}
      onLegendToggle={handleLegendToggle}
      exportConfig={exportConfig}
      isLoading={isLoading}
      error={error}
      isEmpty={!data || data.length === 0}
      emptyMessage="No price data available"
      stats={
        <ChartStatGrid columns={2}>
          <ChartStatCard label="Median Price" value={formatUsd(median, 4)} />
          <ChartStatCard
            label="Most Common"
            value={modeRange.label}
          />
        </ChartStatGrid>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={CHART_MARGINS.default}>
          <CartesianGrid
            strokeDasharray={GRID_STYLE.strokeDasharray}
            stroke={GRID_STYLE.stroke}
            vertical={GRID_STYLE.vertical}
          />
          <XAxis
            dataKey="label"
            stroke={AXIS_STYLE.stroke}
            fontSize={AXIS_STYLE.fontSize}
            fontFamily={AXIS_STYLE.fontFamily}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            stroke={AXIS_STYLE.stroke}
            fontSize={AXIS_STYLE.fontSize}
            fontFamily={AXIS_STYLE.fontFamily}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            width={40}
            tickFormatter={(v) => v.toFixed(0)}
          />
          <Tooltip
            contentStyle={getTooltipContentStyle()}
            labelStyle={{ color: "#fafafa" }}
            formatter={(value) => [`${value} days`, "Frequency"]}
          />
          {visibleSeries.frequency && (
            <Bar
              dataKey="count"
              fill={CHART_COLORS.primary}
              radius={[4, 4, 0, 0]}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </StandardChartCard>
  );
}
