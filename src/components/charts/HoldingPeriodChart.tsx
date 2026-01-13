"use client";

import { useMemo } from "react";
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
import { useTraderAnalysis } from "@/hooks";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatNumber } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import { CHART_MARGINS, AXIS_STYLE, GRID_STYLE, getTooltipContentStyle } from "@/lib/chartConfig";
import { getChartFilename } from "@/lib/chartExport/index";

// Dynamic buckets based on time range
function getBucketsForRange(timeRange: number) {
  if (timeRange <= 7) {
    return {
      buckets: [
        { label: "0-6h", min: 0, max: 0.25 },
        { label: "6-12h", min: 0.25, max: 0.5 },
        { label: "12-24h", min: 0.5, max: 1 },
        { label: "1-2d", min: 1, max: 3 },
        { label: "3-5d", min: 3, max: 6 },
        { label: "5-7d", min: 6, max: 8 },
      ],
      flipperThreshold: 0.5, // < 12h
      holderThreshold: 3,    // >= 3d
      legend: {
        flipper: "<12h",
        trader: "12h-3d",
        holder: "3-7d",
      },
    };
  } else if (timeRange <= 30) {
    return {
      buckets: [
        { label: "0-12h", min: 0, max: 0.5 },
        { label: "12-24h", min: 0.5, max: 1 },
        { label: "1-3d", min: 1, max: 4 },
        { label: "4-7d", min: 4, max: 8 },
        { label: "1-2w", min: 8, max: 15 },
        { label: "2-4w", min: 15, max: 31 },
      ],
      flipperThreshold: 1,  // < 24h
      holderThreshold: 8,   // >= 1w
      legend: {
        flipper: "<24h",
        trader: "1-7d",
        holder: "1-4w",
      },
    };
  } else {
    return {
      buckets: [
        { label: "0-24h", min: 0, max: 1 },
        { label: "1-3d", min: 1, max: 4 },
        { label: "4-7d", min: 4, max: 8 },
        { label: "1-2w", min: 8, max: 15 },
        { label: "2-4w", min: 15, max: 29 },
        { label: "1-3m", min: 29, max: 91 },
      ],
      flipperThreshold: 1,  // < 24h
      holderThreshold: 29,  // >= 4w
      legend: {
        flipper: "<24h",
        trader: "1d-4w",
        holder: "1-3m",
      },
    };
  }
}

export function HoldingPeriodChart() {
  const { timeRange } = useChartSettings();
  const { data, isLoading, error } = useTraderAnalysis(timeRange);

  const bucketConfig = useMemo(() => getBucketsForRange(timeRange), [timeRange]);

  const { chartData, avgHoldingDays, flipperRate, hodlerRate } = useMemo(() => {
    if (!data || data.flips.length === 0) {
      return {
        chartData: [],
        avgHoldingDays: 0,
        flipperRate: 0,
        hodlerRate: 0,
      };
    }

    // Count flips by holding period bucket
    const bucketCounts = bucketConfig.buckets.map((bucket) => ({
      ...bucket,
      count: data.flips.filter(
        (f) => f.holdingDays >= bucket.min && f.holdingDays < bucket.max
      ).length,
    }));

    const totalFlips = data.flips.length;

    // Calculate rates using dynamic thresholds
    const quickFlips = data.flips.filter((f) => f.holdingDays < bucketConfig.flipperThreshold).length;
    const longHolds = data.flips.filter((f) => f.holdingDays >= bucketConfig.holderThreshold).length;

    return {
      chartData: bucketCounts.map((b) => ({
        ...b,
        percentage: totalFlips > 0 ? (b.count / totalFlips) * 100 : 0,
      })),
      avgHoldingDays: data.avgHoldingPeriod,
      flipperRate: totalFlips > 0 ? (quickFlips / totalFlips) * 100 : 0,
      hodlerRate: totalFlips > 0 ? (longHolds / totalFlips) * 100 : 0,
    };
  }, [data, bucketConfig]);

  // Legend items for display
  const legendItems: LegendItem[] = [
    { key: "flippers", label: "Flippers", color: CHART_COLORS.danger },
    { key: "traders", label: "Traders", color: CHART_COLORS.primary },
    { key: "holders", label: "Holders", color: CHART_COLORS.success },
  ];

  // Export configuration
  const exportConfig = useMemo(() => ({
    title: "Holding Period",
    filename: getChartFilename("holding-period", timeRange),
  }), [timeRange]);

  return (
    <StandardChartCard
      title="Holding Period"
      href="/charts/holding-period"
      description="Hold duration distribution for resold tokens"
      legend={legendItems}
      exportConfig={exportConfig}
      isLoading={isLoading}
      error={error}
      isEmpty={!data || chartData.length === 0}
      emptyMessage="No holding period data available"
      stats={
        <ChartStatGrid columns={3}>
          <ChartStatCard
            label="Avg Hold"
            value={`${avgHoldingDays.toFixed(0)}d`}
          />
          <ChartStatCard
            label="Flippers"
            value={`${flipperRate.toFixed(0)}%`}
          />
          <ChartStatCard
            label="Holders"
            value={`${hodlerRate.toFixed(0)}%`}
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
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            fontFamily={AXIS_STYLE.fontFamily}
          />
          <YAxis
            stroke={AXIS_STYLE.stroke}
            fontSize={AXIS_STYLE.fontSize}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            fontFamily={AXIS_STYLE.fontFamily}
            width={40}
          />
          <Tooltip
            contentStyle={getTooltipContentStyle()}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0]?.payload;
              return (
                <div className="bg-background-secondary border border-border rounded-lg p-2 text-xs">
                  <p className="font-bold text-brand">Holding: {d.label}</p>
                  <p className="text-foreground">{formatNumber(d.count)} resales ({d.percentage.toFixed(1)}%)</p>
                </div>
              );
            }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => {
              // Color gradient: red for quick flips, yellow for medium, green for long holds
              const color = index < 2
                ? CHART_COLORS.danger
                : index < 4
                  ? CHART_COLORS.primary
                  : CHART_COLORS.success;
              return <Cell key={`cell-${index}`} fill={color} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </StandardChartCard>
  );
}
