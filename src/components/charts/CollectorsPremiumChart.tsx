"use client";

import { useRef, useMemo, useState } from "react";
import { getChartFilename } from "@/lib/chartExport/index";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import Link from "next/link";
import { Card, CardHeader, CardDescription } from "@/components/ui";
import { ChartExportButtons } from "./ChartExportButtons";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { usePriceHistory } from "@/hooks/usePriceHistory";
import { useBasketPriceHistory } from "@/hooks/useBasketPriceHistory";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatDate } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";

// Calculate 7-day rolling average for an array of values
function calculate7DayMA<T>(data: T[], getValue: (item: T) => number): number[] {
  return data.map((_, i) => {
    const slice = data.slice(Math.max(0, i - 6), i + 1);
    const values = slice.map(getValue);
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  });
}

interface PremiumChartRowProps {
  data: Array<{ date: string; value: number; basketValue?: number }>;
  dataKey: string;
  label: string;
  color: string;
  avg: number;
  basketAvg?: number;
  showXAxis?: boolean;
  showComparison?: boolean;
}

function PremiumChartRow({
  data,
  dataKey,
  label,
  color,
  avg,
  basketAvg,
  showXAxis = false,
  showComparison = false,
}: PremiumChartRowProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Y-axis label */}
      <div className="w-16 shrink-0 text-right">
        <p className="text-[10px] text-foreground-muted leading-none">{label}</p>
        <p className="text-xs font-bold leading-tight" style={{ color }}>
          {avg.toFixed(0)}%
          {showComparison && basketAvg !== undefined && (
            <span className="text-foreground-muted font-normal text-[10px]"> vs {basketAvg.toFixed(0)}%</span>
          )}
        </p>
      </div>

      {/* Chart - add extra height when showing X-axis to keep chart area consistent */}
      <div className={`flex-1 ${showXAxis ? "h-[142px]" : "h-[127px]"}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: showXAxis ? 20 : 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={true} vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#71717a"
              fontSize={11}
              fontFamily="var(--font-mundial)"
              interval={Math.max(0, Math.floor(data.length / 8) - 1)}
              tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              hide={!showXAxis}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              stroke="#71717a"
              fontSize={11}
              fontFamily="var(--font-mundial)"
              tickFormatter={(v) => `${v}%`}
              domain={[0, 100]}
              ticks={[0, 50, 100]}
              width={32}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "#141414", border: "1px solid #27272a", borderRadius: "8px" }}
              labelStyle={{ color: "#fafafa" }}
              formatter={(value, name) => {
                const labelText = name === "basketValue" ? "Leading ETH" : "GVC";
                return [`${Number(value).toFixed(1)}%`, labelText];
              }}
              labelFormatter={(l) => formatDate(l)}
            />
            {showComparison && (
              <Line
                type="monotone"
                dataKey="basketValue"
                stroke={CHART_COLORS.muted}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                activeDot={{ r: 4, fill: CHART_COLORS.muted, stroke: "#0a0a0a", strokeWidth: 2 }}
              />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3, fill: color, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: color, stroke: "#0a0a0a", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function CollectorsPremiumChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const [showComparison, setShowComparison] = useState(false);
  const { timeRange } = useChartSettings();
  const { data, isLoading, error } = usePriceHistory(timeRange);
  const { data: basketData, isLoading: basketLoading } = useBasketPriceHistory(timeRange);

  const exportConfig = useMemo(() => ({
    title: "Collector's Premium",
    subtitle: `% of daily sales priced above floor over ${timeRange} days (7D smoothed)`,
    legend: [
      { color: CHART_COLORS.success, label: ">10% Premium", value: "Floor+" },
      { color: CHART_COLORS.primary, label: ">25% Premium", value: "Floor+" },
      { color: CHART_COLORS.accent, label: ">50% Premium", value: "Floor+" },
    ],
    filename: getChartFilename("collectors-premium", timeRange),
  }), [timeRange]);

  // Merge GVC data with basket data and apply 7-day rolling average
  const { data10, data25, data50, avg10, avg25, avg50, basketAvg10, basketAvg25, basketAvg50 } = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        data10: [], data25: [], data50: [],
        avg10: 0, avg25: 0, avg50: 0,
        basketAvg10: 0, basketAvg25: 0, basketAvg50: 0,
      };
    }

    // Calculate 7-day rolling averages for GVC
    const gvc10MA = calculate7DayMA(data, (d) => d.salesAbove10Pct);
    const gvc25MA = calculate7DayMA(data, (d) => d.salesAbove25Pct);
    const gvc50MA = calculate7DayMA(data, (d) => d.salesAbove50Pct);

    // Create basket data lookup by date and calculate 7-day MA
    const basketDailyArr = basketData?.dailyData || [];
    const basket10MA = calculate7DayMA(basketDailyArr, (d) => d.salesAbove10Pct);
    const basket25MA = calculate7DayMA(basketDailyArr, (d) => d.salesAbove25Pct);
    const basket50MA = calculate7DayMA(basketDailyArr, (d) => d.salesAbove50Pct);

    const basketByDate = new Map<string, { above10: number; above25: number; above50: number }>();
    basketDailyArr.forEach((d, i) => {
      basketByDate.set(d.date, {
        above10: basket10MA[i],
        above25: basket25MA[i],
        above50: basket50MA[i],
      });
    });

    // Transform data with 7-day MA values
    const d10 = data.map((d, i) => ({
      date: d.date,
      value: gvc10MA[i],
      basketValue: basketByDate.get(d.date)?.above10,
    }));
    const d25 = data.map((d, i) => ({
      date: d.date,
      value: gvc25MA[i],
      basketValue: basketByDate.get(d.date)?.above25,
    }));
    const d50 = data.map((d, i) => ({
      date: d.date,
      value: gvc50MA[i],
      basketValue: basketByDate.get(d.date)?.above50,
    }));

    // Calculate overall averages from the 7-day MA data
    const a10 = gvc10MA.length > 0 ? gvc10MA.reduce((sum, v) => sum + v, 0) / gvc10MA.length : 0;
    const a25 = gvc25MA.length > 0 ? gvc25MA.reduce((sum, v) => sum + v, 0) / gvc25MA.length : 0;
    const a50 = gvc50MA.length > 0 ? gvc50MA.reduce((sum, v) => sum + v, 0) / gvc50MA.length : 0;

    const bAvg10 = basket10MA.length > 0 ? basket10MA.reduce((sum, v) => sum + v, 0) / basket10MA.length : 0;
    const bAvg25 = basket25MA.length > 0 ? basket25MA.reduce((sum, v) => sum + v, 0) / basket25MA.length : 0;
    const bAvg50 = basket50MA.length > 0 ? basket50MA.reduce((sum, v) => sum + v, 0) / basket50MA.length : 0;

    return {
      data10: d10, data25: d25, data50: d50,
      avg10: a10, avg25: a25, avg50: a50,
      basketAvg10: bAvg10,
      basketAvg25: bAvg25,
      basketAvg50: bAvg50,
    };
  }, [data, basketData]);

  if (isLoading) return <ChartSkeleton />;
  if (error || !data || data.length === 0) {
    return (
      <Card>
        <CardHeader><span className="text-lg font-bold font-brice">Collector's Premium</span></CardHeader>
        <p className="text-foreground-muted text-center py-8">No data available</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <Link href="/charts/collectors-premium" className="text-lg font-bold text-foreground font-brice hover:text-brand transition-colors">
            Collector's Premium
          </Link>
          <p className="export-branding text-sm text-brand font-mundial">Good Vibes Club</p>
          <CardDescription>% of daily sales priced above floor (7D smoothed)</CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setShowComparison(false)}
              className={`px-2.5 py-1 text-[10px] font-medium transition-colors ${
                !showComparison
                  ? "bg-brand text-background"
                  : "text-foreground-muted hover:text-foreground hover:bg-border"
              }`}
            >
              GVC
            </button>
            <button
              onClick={() => setShowComparison(true)}
              className={`px-2.5 py-1 text-[10px] font-medium transition-colors ${
                showComparison
                  ? "bg-brand text-background"
                  : "text-foreground-muted hover:text-foreground hover:bg-border"
              }`}
            >
              Compare{basketLoading && showComparison ? "..." : ""}
            </button>
          </div>
          <ChartExportButtons chartRef={chartRef} config={exportConfig} />
        </div>
      </CardHeader>

      <div ref={chartRef} className="px-1 pt-1 bg-background-secondary rounded-lg chart-container flex-1 flex flex-col">
        {/* Legend when comparison is active */}
        {showComparison && !basketLoading && (
          <div className="flex items-center gap-4 mb-1 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 bg-brand rounded" />
              <span className="text-foreground-muted">GVC</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 rounded bg-foreground-muted/50" style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 2px, #71717a 2px, #71717a 4px)" }} />
              <span className="text-foreground-muted">Leading ETH</span>
            </div>
          </div>
        )}

        {/* Three stacked line charts */}
        <div className="space-y-0">
          <PremiumChartRow
            data={data10}
            dataKey="salesAbove10Pct"
            label=">10%"
            color={CHART_COLORS.success}
            avg={avg10}
            basketAvg={basketAvg10}
            showComparison={showComparison && !basketLoading}
          />
          <PremiumChartRow
            data={data25}
            dataKey="salesAbove25Pct"
            label=">25%"
            color={CHART_COLORS.primary}
            avg={avg25}
            basketAvg={basketAvg25}
            showComparison={showComparison && !basketLoading}
          />
          <PremiumChartRow
            data={data50}
            dataKey="salesAbove50Pct"
            label=">50%"
            color={CHART_COLORS.accent}
            avg={avg50}
            basketAvg={basketAvg50}
            showComparison={showComparison && !basketLoading}
            showXAxis={true}
          />
        </div>
      </div>
    </Card>
  );
}
