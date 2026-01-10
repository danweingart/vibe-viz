"use client";

import { useRef, useMemo } from "react";
import { getChartFilename } from "@/lib/chartExport/index";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Link from "next/link";
import { Card, CardHeader, CardDescription } from "@/components/ui";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { ChartExportButtons } from "./ChartExportButtons";
import { usePriceHistory } from "@/hooks/usePriceHistory";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatEth, formatUsd, formatDate } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";

// Generate evenly spaced tick values for X-axis alignment across charts
function getAlignedTicks(dates: string[], count: number): string[] {
  if (dates.length <= count) return dates;
  const step = (dates.length - 1) / (count - 1);
  return Array.from({ length: count }, (_, i) => dates[Math.round(i * step)]);
}

export function PriceHistoryChart() {
  const { timeRange, currency } = useChartSettings();
  const chartRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = usePriceHistory(timeRange);

  const exportConfig = useMemo(() => ({
    title: "Average Sale Price",
    subtitle: `Mean sale price per day over ${timeRange} days`,
    legend: [
      { color: CHART_COLORS.primary, label: "Avg Sale Price", value: currency === "eth" ? "ETH" : "USD" },
    ],
    filename: getChartFilename("avg-price", timeRange),
  }), [timeRange, currency]);

  if (isLoading) {
    return <ChartSkeleton />;
  }

  if (error || !data || data.length === 0) {
    return (
      <Card>
        <CardHeader><span className="text-lg font-bold font-brice">Average Sale Price</span></CardHeader>
        <p className="text-foreground-muted text-center py-8">
          {error ? "Failed to load price history" : "No sales data available yet"}
        </p>
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    displayPrice: currency === "eth" ? d.avgPrice : d.avgPrice * d.ethPrice,
  }));

  const currentPrice = chartData[chartData.length - 1]?.displayPrice || 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <Link href="/charts/price-history" className="text-lg font-bold text-foreground font-brice hover:text-brand transition-colors">
            Average Sale Price
          </Link>
          <p className="export-branding text-sm text-brand font-mundial">Good Vibes Club</p>
          <CardDescription>Mean sale price per day (all sales averaged)</CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-bold text-foreground">
              {currency === "eth" ? formatEth(currentPrice, 2) : formatUsd(currentPrice)}
            </p>
            <p className="text-[10px] text-foreground-muted">Current</p>
          </div>
          <ChartExportButtons chartRef={chartRef} config={exportConfig} />
        </div>
      </CardHeader>

      {/* Spacer to match SalesVolumeChart toggle row height */}
      <div className="h-[34px]" />

      <div ref={chartRef} className="px-1 pt-1 bg-background-secondary rounded-lg chart-container flex-1 flex flex-col">
        <div className="flex-1 min-h-[120px] sm:min-h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#71717a"
                fontSize={13}
                tickLine={false}
                axisLine={false}
                fontFamily="var(--font-mundial)"
                ticks={getAlignedTicks(chartData.map(d => d.date), 6)}
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                }
              />
              <YAxis
                stroke="#71717a"
                fontSize={13}
                axisLine={false}
                tickLine={false}
                fontFamily="var(--font-mundial)"
                width={40}
                tickFormatter={(value) =>
                  currency === "eth" ? `${value.toFixed(2)}` : `$${value.toFixed(0)}`
                }
              />
              <Tooltip
                contentStyle={{ backgroundColor: "#141414", border: "1px solid #27272a", borderRadius: "8px" }}
                labelStyle={{ color: "#fafafa" }}
                formatter={(value) => [
                  currency === "eth" ? formatEth(Number(value), 2) : formatUsd(Number(value)),
                  "Avg Price",
                ]}
                labelFormatter={(label) => formatDate(label)}
              />
              <Area
                type="monotone"
                dataKey="displayPrice"
                stroke={CHART_COLORS.primary}
                strokeWidth={2}
                fill="url(#priceGradient)"
                dot={chartData.length > 30 ? false : { r: 3, fill: CHART_COLORS.primary, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: CHART_COLORS.primary, stroke: "#0a0a0a", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Footer to match SalesVolumeChart height */}
        <div className="flex justify-between items-center mt-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 rounded" style={{ backgroundColor: CHART_COLORS.primary }} />
            <span className="text-foreground-muted">Avg Sale Price</span>
          </div>
          <span className="text-foreground-muted">
            {data.length} days
          </span>
        </div>
      </div>
    </Card>
  );
}
