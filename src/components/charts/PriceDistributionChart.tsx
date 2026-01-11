"use client";

import { useRef, useMemo } from "react";
import { getChartFilename } from "@/lib/chartExport/index";
import { ChartExportButtons } from "./ChartExportButtons";
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
import Link from "next/link";
import { Card, CardHeader, CardDescription, ChartLegendToggle, ChartStatCard, ChartStatGrid } from "@/components/ui";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { usePriceHistory } from "@/hooks";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatEth, formatNumber } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import { CHART_MARGINS, AXIS_STYLE, GRID_STYLE, CHART_HEIGHT, getTooltipContentStyle } from "@/lib/chartConfig";

export function PriceDistributionChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const { currency, timeRange } = useChartSettings();
  const { data: priceHistory, isLoading, error } = usePriceHistory(timeRange);

  const exportConfig = useMemo(() => ({
    title: "Price Distribution",
    subtitle: `Sale count by ETH price bucket over ${timeRange} days`,
    legend: [
      { color: CHART_COLORS.primary, label: "Sales by Price", value: "Count" },
    ],
    filename: getChartFilename("price-distribution", timeRange),
  }), [timeRange]);

  const legendItems = [
    { key: "sales", label: "Sales by Price", color: CHART_COLORS.primary },
  ];

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

  if (isLoading) return <ChartSkeleton />;
  if (error || !priceHistory || priceHistory.length === 0) {
    return (
      <Card>
        <CardHeader><span className="text-lg font-bold font-brice">Sale Price Distribution</span></CardHeader>
        <p className="text-foreground-muted text-center py-8">No data available</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <Link href="/charts/price-distribution" className="text-lg font-bold text-foreground font-brice hover:text-brand transition-colors">
            Price Distribution
          </Link>
          <CardDescription>Sale count by ETH price bucket</CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <ChartExportButtons chartRef={chartRef} config={exportConfig} />
        </div>
      </CardHeader>

      <div className="flex items-center px-3 mb-3">
        <ChartLegendToggle items={legendItems} />
      </div>

      <div ref={chartRef} className="p-3 bg-background-secondary rounded-lg chart-container flex-1 flex flex-col">
        <div className="flex-1 min-h-[320px] sm:min-h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={CHART_MARGINS.default}>
              <CartesianGrid strokeDasharray={GRID_STYLE.strokeDasharray} stroke={GRID_STYLE.stroke} vertical={GRID_STYLE.vertical} />
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
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

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
    </Card>
  );
}
