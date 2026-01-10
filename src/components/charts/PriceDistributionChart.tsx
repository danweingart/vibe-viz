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
import { Card, CardHeader, CardDescription } from "@/components/ui";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { usePriceHistory } from "@/hooks";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatEth, formatNumber } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";

export function PriceDistributionChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const { currency, timeRange } = useChartSettings();
  const { data: priceHistory, isLoading, error } = usePriceHistory(timeRange);

  const exportConfig = useMemo(() => ({
    title: "Price Distribution",
    subtitle: `Sale count by ETH price bucket over ${timeRange} days (log scale)`,
    legend: [
      { color: CHART_COLORS.primary, label: "Sales by Price", value: "Count" },
    ],
    filename: getChartFilename("price-distribution", timeRange),
  }), [timeRange]);

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
          <p className="export-branding text-sm text-brand font-mundial">Good Vibes Club</p>
          <CardDescription>Sale count by ETH price bucket (log scale)</CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex gap-3 text-right text-xs">
            <div>
              <p className="font-bold text-foreground">
                {formatEth(avgPrice, 2)}
              </p>
              <p className="text-[10px] text-foreground-muted">Avg</p>
            </div>
            <div>
              <p className="font-bold text-foreground">
                {formatEth(medianPrice, 2)}
              </p>
              <p className="text-[10px] text-foreground-muted">Median</p>
            </div>
          </div>
          <ChartExportButtons chartRef={chartRef} config={exportConfig} />
        </div>
      </CardHeader>

      <div ref={chartRef} className="px-1 pt-1 bg-background-secondary rounded-lg chart-container flex-1 flex flex-col">
        <div className="flex-1 min-h-[160px] sm:min-h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 8, left: -5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="displayMin"
                stroke="#71717a"
                fontSize={11}
                fontFamily="var(--font-mundial)"
                axisLine={false}
                tickLine={false}
                angle={-45}
                textAnchor="end"
                height={50}
              />
              <YAxis
                stroke="#71717a"
                fontSize={11}
                fontFamily="var(--font-mundial)"
                axisLine={false}
                tickLine={false}
                width={35}
                scale="log"
                domain={[1, 'auto']}
                allowDataOverflow
              />
              <Tooltip
                contentStyle={{ backgroundColor: "#141414", border: "1px solid #27272a", borderRadius: "8px" }}
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
    </Card>
  );
}
