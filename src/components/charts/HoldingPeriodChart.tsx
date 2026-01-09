"use client";

import { useRef, useMemo } from "react";
import { getChartFilename } from "@/lib/chartExport/index";
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
import { ChartExportButtons } from "./ChartExportButtons";
import { useTraderAnalysis } from "@/hooks";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatNumber } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";

const HOLDING_BUCKETS = [
  { label: "<1d", min: 0, max: 1 },
  { label: "1-7d", min: 1, max: 7 },
  { label: "1-2w", min: 7, max: 14 },
  { label: "2-4w", min: 14, max: 28 },
  { label: "1-2m", min: 28, max: 60 },
  { label: "2-3m", min: 60, max: 90 },
  { label: "3m+", min: 90, max: 999 },
];

export function HoldingPeriodChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const { timeRange } = useChartSettings();
  const { data, isLoading, error } = useTraderAnalysis(timeRange);

  const exportConfig = useMemo(() => ({
    title: "Holding Period",
    subtitle: "Time between buy and sell for resales within this period",
    legend: [
      { color: CHART_COLORS.danger, label: "Flippers", value: "<7 days" },
      { color: CHART_COLORS.primary, label: "Traders", value: "7-30 days" },
      { color: CHART_COLORS.success, label: "Holders", value: ">30 days" },
    ],
    filename: getChartFilename("holding-period", timeRange),
  }), [timeRange]);

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
    const bucketCounts = HOLDING_BUCKETS.map((bucket) => ({
      ...bucket,
      count: data.flips.filter(
        (f) => f.holdingDays >= bucket.min && f.holdingDays < bucket.max
      ).length,
    }));

    const totalFlips = data.flips.length;

    // Calculate rates
    const quickFlips = data.flips.filter((f) => f.holdingDays < 7).length;
    const longHolds = data.flips.filter((f) => f.holdingDays >= 30).length;

    return {
      chartData: bucketCounts.map((b) => ({
        ...b,
        percentage: totalFlips > 0 ? (b.count / totalFlips) * 100 : 0,
      })),
      avgHoldingDays: data.avgHoldingPeriod,
      flipperRate: totalFlips > 0 ? (quickFlips / totalFlips) * 100 : 0,
      hodlerRate: totalFlips > 0 ? (longHolds / totalFlips) * 100 : 0,
    };
  }, [data]);

  if (isLoading) return <ChartSkeleton />;
  if (error || !data || chartData.length === 0) {
    return (
      <Card>
        <CardHeader><span className="text-lg font-bold font-brice">Holding Period</span></CardHeader>
        <p className="text-foreground-muted text-center py-8">No holding period data available</p>
      </Card>
    );
  }

  const maxCount = Math.max(...chartData.map((d) => d.count));

  return (
    <Card>
      {/* UI Header - hidden during export */}
      <CardHeader className="flex flex-row items-start justify-between export-hide">
        <div>
          <Link href="/charts/holding-period" className="text-lg font-bold text-foreground font-brice hover:text-brand transition-colors">
            Holding Period
          </Link>
          <p className="export-branding text-sm text-brand font-mundial">Good Vibes Club</p>
          <CardDescription>Time between buy and sell for resales within this period</CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-3 text-right text-xs">
            <div>
              <p className="font-bold text-chart-info">{avgHoldingDays.toFixed(0)}d</p>
              <p className="text-foreground-muted">Avg Hold</p>
            </div>
            <div>
              <p className="font-bold text-chart-danger">{flipperRate.toFixed(0)}%</p>
              <p className="text-foreground-muted">Flippers</p>
            </div>
            <div>
              <p className="font-bold text-chart-success">{hodlerRate.toFixed(0)}%</p>
              <p className="text-foreground-muted">Holders</p>
            </div>
          </div>
          <ChartExportButtons chartRef={chartRef} config={exportConfig} />
        </div>
      </CardHeader>

      {/* Chart container */}
      <div ref={chartRef} className="px-1 pt-1 bg-background-secondary rounded-lg chart-container flex-1 flex flex-col">
        {/* Chart */}
        <div className="chart-wrapper flex-1 flex flex-col">
          <div className="chart-height flex-1 min-h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 8, left: -5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="label" stroke="#71717a" fontSize={11} axisLine={false} tickLine={false} fontFamily="var(--font-mundial)" />
                <YAxis stroke="#71717a" fontSize={11} axisLine={false} tickLine={false} fontFamily="var(--font-mundial)" width={35} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#141414", border: "1px solid #27272a", borderRadius: "8px" }}
                  labelStyle={{ color: "#fafafa" }}
                  formatter={(value, name) => [
                    `${formatNumber(Number(value))} resales`,
                    "Count",
                  ]}
                  labelFormatter={(label) => `Holding: ${label}`}
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
          </div>
        </div>

        {/* UI Legend - shown on frontend only */}
        <div className="export-hide grid grid-cols-3 gap-2 mt-2 text-xs text-center">
          <div className="bg-background-tertiary rounded p-2">
            <div className="flex items-center justify-center gap-1 mb-1">
              <div className="w-2 h-2 rounded" style={{ backgroundColor: CHART_COLORS.danger }} />
              <span className="text-foreground-muted">Flippers</span>
            </div>
            <p className="font-bold text-chart-danger">&lt;7 days</p>
          </div>
          <div className="bg-background-tertiary rounded p-2">
            <div className="flex items-center justify-center gap-1 mb-1">
              <div className="w-2 h-2 rounded" style={{ backgroundColor: CHART_COLORS.primary }} />
              <span className="text-foreground-muted">Traders</span>
            </div>
            <p className="font-bold text-brand">7-30 days</p>
          </div>
          <div className="bg-background-tertiary rounded p-2">
            <div className="flex items-center justify-center gap-1 mb-1">
              <div className="w-2 h-2 rounded" style={{ backgroundColor: CHART_COLORS.success }} />
              <span className="text-foreground-muted">Holders</span>
            </div>
            <p className="font-bold text-chart-success">&gt;30 days</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
