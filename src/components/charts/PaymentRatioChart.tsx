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
} from "recharts";
import Link from "next/link";
import { Card, CardHeader, CardDescription } from "@/components/ui";
import { ChartExportButtons } from "./ChartExportButtons";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { usePriceHistory, useBasketPriceHistory } from "@/hooks";
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

interface DailyPaymentData {
  date: string;
  ethPct: number;
  wethPct: number;
}

interface PaymentLineChartProps {
  data: DailyPaymentData[];
  label: string;
  showXAxis?: boolean;
  avgEth: number;
  avgWeth: number;
}

function PaymentLineChart({ data, label, showXAxis = true, avgEth, avgWeth }: PaymentLineChartProps) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-foreground-muted font-medium">{label}</p>
        <div className="flex gap-3 text-[10px]">
          <span style={{ color: CHART_COLORS.primary }}>ETH: {avgEth.toFixed(0)}%</span>
          <span style={{ color: CHART_COLORS.danger }}>WETH: {avgWeth.toFixed(0)}%</span>
        </div>
      </div>
      <div className="flex-1 min-h-[120px] sm:min-h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 12, left: 0, bottom: showXAxis ? 20 : 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={true} vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#71717a"
              fontSize={11}
              fontFamily="var(--font-mundial)"
              interval={Math.max(0, Math.floor(data.length / 5) - 1)}
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
              ticks={[0, 25, 50, 75, 100]}
              width={40}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "#141414", border: "1px solid #27272a", borderRadius: "8px" }}
              labelStyle={{ color: "#fafafa" }}
              formatter={(value, name) => {
                const labelText = name === "ethPct" ? "ETH" : "WETH";
                return [`${Number(value).toFixed(1)}%`, labelText];
              }}
              labelFormatter={(l) => formatDate(l)}
            />
            <Line
              type="monotone"
              dataKey="ethPct"
              stroke={CHART_COLORS.primary}
              strokeWidth={2}
              dot={{ r: 3, fill: CHART_COLORS.primary, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: CHART_COLORS.primary, stroke: "#0a0a0a", strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="wethPct"
              stroke={CHART_COLORS.danger}
              strokeWidth={2}
              dot={{ r: 3, fill: CHART_COLORS.danger, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: CHART_COLORS.danger, stroke: "#0a0a0a", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function PaymentRatioChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const [showComparison, setShowComparison] = useState(false);
  const { timeRange } = useChartSettings();
  const { data: priceHistory, isLoading, error } = usePriceHistory(timeRange);
  const { data: basketData, isLoading: basketLoading } = useBasketPriceHistory(timeRange);

  const exportConfig = useMemo(() => ({
    title: "ETH vs WETH Payments",
    subtitle: `Payment method usage by volume over ${timeRange} days (7D smoothed)`,
    legend: [
      { color: CHART_COLORS.primary, label: "ETH", value: "Native" },
      { color: CHART_COLORS.danger, label: "WETH", value: "Wrapped" },
    ],
    filename: getChartFilename("payment-ratio", timeRange),
  }), [timeRange]);

  // Transform daily payment data into percentages with 7-day rolling average
  const { gvcDailyData, basketDailyData, gvcAvgEth, gvcAvgWeth, basketAvgEth, basketAvgWeth } = useMemo(() => {
    if (!priceHistory) {
      return {
        gvcDailyData: [],
        basketDailyData: [],
        gvcAvgEth: 0,
        gvcAvgWeth: 0,
        basketAvgEth: 0,
        basketAvgWeth: 0,
      };
    }

    // Calculate daily GVC percentages using volume-weighting (ETH + WETH only, excludes Other)
    const gvcDailyRaw = priceHistory.map((day) => {
      // Use volume fields if available, fallback to count * avgPrice for backward compatibility
      const ethVol = day.ethVolume ?? day.ethPayments * day.avgPrice;
      const wethVol = day.wethVolume ?? day.wethPayments * day.avgPrice;
      const totalVol = ethVol + wethVol;
      return {
        date: day.date,
        ethPct: totalVol > 0 ? (ethVol / totalVol) * 100 : 0,
        wethPct: totalVol > 0 ? (wethVol / totalVol) * 100 : 0,
      };
    });

    // Apply 7-day rolling average to GVC data
    const gvcEthMA = calculate7DayMA(gvcDailyRaw, (d) => d.ethPct);
    const gvcWethMA = calculate7DayMA(gvcDailyRaw, (d) => d.wethPct);

    const gvcDaily: DailyPaymentData[] = gvcDailyRaw.map((d, i) => ({
      date: d.date,
      ethPct: gvcEthMA[i],
      wethPct: gvcWethMA[i],
    }));

    // Calculate GVC averages from smoothed data
    const gvcEthAvg = gvcDaily.length > 0
      ? gvcDaily.reduce((sum, d) => sum + d.ethPct, 0) / gvcDaily.length
      : 0;
    const gvcWethAvg = gvcDaily.length > 0
      ? gvcDaily.reduce((sum, d) => sum + d.wethPct, 0) / gvcDaily.length
      : 0;

    // Get basket daily data and apply 7-day rolling average
    const basketDailyRaw = basketData?.dailyData || [];
    const basketEthMA = calculate7DayMA(basketDailyRaw, (d) => d.ethPct);
    const basketWethMA = calculate7DayMA(basketDailyRaw, (d) => d.wethPct);

    const basketDaily: DailyPaymentData[] = basketDailyRaw.map((d, i) => ({
      date: d.date,
      ethPct: basketEthMA[i],
      wethPct: basketWethMA[i],
    }));

    // Calculate basket averages from smoothed data
    const basketEthAvg = basketDaily.length > 0
      ? basketDaily.reduce((sum, d) => sum + d.ethPct, 0) / basketDaily.length
      : basketData?.aggregated.ethPaymentPct || 0;
    const basketWethAvg = basketDaily.length > 0
      ? basketDaily.reduce((sum, d) => sum + d.wethPct, 0) / basketDaily.length
      : basketData?.aggregated.wethPaymentPct || 0;

    return {
      gvcDailyData: gvcDaily,
      basketDailyData: basketDaily,
      gvcAvgEth: gvcEthAvg,
      gvcAvgWeth: gvcWethAvg,
      basketAvgEth: basketEthAvg,
      basketAvgWeth: basketWethAvg,
    };
  }, [priceHistory, basketData]);

  if (isLoading) return <ChartSkeleton />;
  if (error || !priceHistory) {
    return (
      <Card>
        <CardHeader><span className="text-lg font-bold font-brice">Payment Methods</span></CardHeader>
        <p className="text-foreground-muted text-center py-8">Failed to load data</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <Link href="/charts/payment-ratio" className="text-lg font-bold text-foreground font-brice hover:text-brand transition-colors">
            ETH vs WETH Payments
          </Link>
          <p className="export-branding text-sm text-brand font-mundial">Good Vibes Club</p>
          <CardDescription>ETH vs WETH usage by volume (7D smoothed)</CardDescription>
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
        {/* Legend */}
        <div className="flex items-center gap-4 mb-1 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded" style={{ backgroundColor: CHART_COLORS.primary }} />
            <span className="text-foreground-muted">ETH</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded" style={{ backgroundColor: CHART_COLORS.danger }} />
            <span className="text-foreground-muted">WETH</span>
          </div>
        </div>

        {/* Single or side-by-side line charts */}
        {showComparison && !basketLoading && basketDailyData.length > 0 ? (
          <div className="flex gap-4">
            <PaymentLineChart
              data={gvcDailyData}
              label="Good Vibes Club"
              avgEth={gvcAvgEth}
              avgWeth={gvcAvgWeth}
            />
            <PaymentLineChart
              data={basketDailyData}
              label="Leading ETH Collections"
              avgEth={basketAvgEth}
              avgWeth={basketAvgWeth}
            />
          </div>
        ) : (
          <div className="flex-1 min-h-[120px] sm:min-h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={gvcDailyData} margin={{ top: 5, right: 12, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="date"
                  stroke="#71717a"
                  fontSize={11}
                  fontFamily="var(--font-mundial)"
                  interval={Math.max(0, Math.floor(gvcDailyData.length / 6) - 1)}
                  tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="#71717a"
                  fontSize={11}
                  fontFamily="var(--font-mundial)"
                  tickFormatter={(v) => `${v}%`}
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  width={40}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#141414", border: "1px solid #27272a", borderRadius: "8px" }}
                  labelStyle={{ color: "#fafafa" }}
                  formatter={(value, name) => {
                    const labelText = name === "ethPct" ? "ETH" : "WETH";
                    return [`${Number(value).toFixed(1)}%`, labelText];
                  }}
                  labelFormatter={(l) => formatDate(l)}
                />
                <Line
                  type="monotone"
                  dataKey="ethPct"
                  stroke={CHART_COLORS.primary}
                  strokeWidth={2}
                  dot={{ r: 3, fill: CHART_COLORS.primary, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: CHART_COLORS.primary, stroke: "#0a0a0a", strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="wethPct"
                  stroke={CHART_COLORS.danger}
                  strokeWidth={2}
                  dot={{ r: 3, fill: CHART_COLORS.danger, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: CHART_COLORS.danger, stroke: "#0a0a0a", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Summary stats - hide in comparison mode since each chart shows its own */}
        {!(showComparison && !basketLoading && basketDailyData.length > 0) && (
          <div className="flex justify-center gap-5 mt-2 text-xs text-foreground-muted">
            <span>ETH: <span style={{ color: CHART_COLORS.primary }}>{gvcAvgEth.toFixed(0)}%</span></span>
            <span>WETH: <span style={{ color: CHART_COLORS.danger }}>{gvcAvgWeth.toFixed(0)}%</span></span>
          </div>
        )}
      </div>
    </Card>
  );
}
