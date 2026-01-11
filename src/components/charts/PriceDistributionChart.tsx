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
  Cell,
} from "recharts";
import { ChartStatCard, ChartStatGrid } from "@/components/ui";
import { StandardChartCard, LegendItem } from "@/components/charts/StandardChartCard";
import { usePriceHistory } from "@/hooks";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatEth, formatNumber } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import { CHART_MARGINS, AXIS_STYLE, GRID_STYLE, getTooltipContentStyle } from "@/lib/chartConfig";
import { getChartFilename } from "@/lib/chartExport/index";

export function PriceDistributionChart() {
  const { timeRange } = useChartSettings();
  const { data: priceHistory, isLoading, error } = usePriceHistory(timeRange);

  // Track which series are visible
  const [visibleSeries, setVisibleSeries] = useState({
    sales: true,
  });

  const handleLegendToggle = (key: string) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
  };

  const { chartData, avgPrice, medianPrice } = useMemo(() => {
    if (!priceHistory || priceHistory.length === 0) {
      return { chartData: [], avgPrice: 0, medianPrice: 0 };
    }

    // Flatten all sale prices from price history (ETH only for consistent buckets)
    const allPrices: number[] = [];
    for (const day of priceHistory) {
      for (const sale of day.salePrices) {
        allPrices.push(sale.eth);
      }
    }

    if (allPrices.length === 0) {
      return { chartData: [], avgPrice: 0, medianPrice: 0 };
    }

    // Fixed 1 ETH buckets: 0-1, 1-2, 2-3, etc. Always start at 0
    const maxPrice = Math.max(...allPrices);
    const numBuckets = Math.max(Math.min(Math.ceil(maxPrice) + 1, 10), 5); // At least 5 buckets, cap at 10

    const buckets: { range: string; count: number; min: number; max: number; displayMin: string }[] = [];
    for (let i = 0; i < numBuckets; i++) {
      const bucketMin = i;
      const bucketMax = i + 1;
      const count = allPrices.filter((p) => p >= bucketMin && p < bucketMax).length;

      // Handle overflow bucket for highest bucket
      const isLastBucket = i === numBuckets - 1;
      const actualCount = isLastBucket
        ? allPrices.filter((p) => p >= bucketMin).length
        : count;

      buckets.push({
        range: isLastBucket && maxPrice >= numBuckets ? `${bucketMin}+` : `${bucketMin}-${bucketMax}`,
        count: actualCount,
        min: bucketMin,
        max: bucketMax,
        displayMin: `${bucketMin}-${isLastBucket && maxPrice >= numBuckets ? "+" : bucketMax}E`,
      });
    }

    const avg = allPrices.reduce((sum, p) => sum + p, 0) / allPrices.length;
    const sorted = [...allPrices].sort((a, b) => a - b);
    const midIndex = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0
      ? (sorted[midIndex - 1] + sorted[midIndex]) / 2
      : sorted[midIndex];

    return { chartData: buckets, avgPrice: avg, medianPrice: median };
  }, [priceHistory]);

  // Legend items with active state
  const legendItems: LegendItem[] = [
    { key: "sales", label: "Sales by Price", color: CHART_COLORS.primary, active: visibleSeries.sales },
  ];

  // Export configuration
  const exportConfig = useMemo(() => ({
    title: "Price Distribution",
    subtitle: `Sale count by ETH price bucket over ${timeRange} days`,
    filename: getChartFilename("price-distribution", timeRange),
    legend: [
      { color: CHART_COLORS.primary, label: "Sales by Price", value: "Count" },
    ],
  }), [timeRange]);

  return (
    <StandardChartCard
      title="Price Distribution"
      href="/charts/price-distribution"
      description="Sales distribution across price ranges"
      legend={legendItems}
      onLegendToggle={handleLegendToggle}
      exportConfig={exportConfig}
      isLoading={isLoading}
      error={error}
      isEmpty={!priceHistory || priceHistory.length === 0 || chartData.length === 0}
      emptyMessage="No price distribution data available"
      stats={
        <ChartStatGrid columns={2}>
          <ChartStatCard
            label="Average"
            value={formatEth(avgPrice, 2)}
          />
          <ChartStatCard
            label="Median"
            value={formatEth(medianPrice, 2)}
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
            dataKey="displayMin"
            stroke={AXIS_STYLE.stroke}
            fontSize={AXIS_STYLE.fontSize}
            fontFamily={AXIS_STYLE.fontFamily}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            angle={-45}
            textAnchor="end"
            height={50}
          />
          <YAxis
            stroke={AXIS_STYLE.stroke}
            fontSize={AXIS_STYLE.fontSize}
            fontFamily={AXIS_STYLE.fontFamily}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            width={40}
            domain={[0, 'auto']}
          />
          <Tooltip
            contentStyle={getTooltipContentStyle()}
            labelStyle={{ color: "#fafafa" }}
            formatter={(value) => [formatNumber(Number(value)), "Sales"]}
            labelFormatter={(label, payload) => {
              if (payload && payload[0]) {
                return payload[0].payload.range + " ETH";
              }
              return label;
            }}
          />
          {visibleSeries.sales && (
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => {
                // Yellow -> Blue -> Orange gradient (matching Holder Distribution)
                const color = index < 2
                  ? CHART_COLORS.primary
                  : index < 5
                    ? CHART_COLORS.info
                    : CHART_COLORS.accent;
                return (
                  <Cell key={`cell-${index}`} fill={color} />
                );
              })}
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>
    </StandardChartCard>
  );
}
