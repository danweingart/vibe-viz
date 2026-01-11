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
import { Card, CardHeader, CardDescription, ChartLegendToggle, ChartStatCard, ChartStatGrid } from "@/components/ui";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { ChartExportButtons } from "./ChartExportButtons";
import { usePriceHistory } from "@/hooks/usePriceHistory";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatEth, formatUsd, formatDate } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import { CHART_MARGINS, AXIS_STYLE, GRID_STYLE, CHART_HEIGHT, getTooltipContentStyle } from "@/lib/chartConfig";

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

  const legendItems = [
    { key: "price", label: "Avg Price", color: CHART_COLORS.primary },
  ];

  const lastWeek = chartData.slice(-7);
  const prevWeek = chartData.slice(-14, -7);
  const lastWeekAvg = lastWeek.length > 0 ? lastWeek.reduce((sum, d) => sum + d.displayPrice, 0) / lastWeek.length : 0;
  const prevWeekAvg = prevWeek.length > 0 ? prevWeek.reduce((sum, d) => sum + d.displayPrice, 0) / prevWeek.length : 0;
  const weekChange = prevWeekAvg > 0 ? ((lastWeekAvg - prevWeekAvg) / prevWeekAvg) * 100 : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <Link href="/charts/price-history" className="text-lg font-bold text-foreground font-brice hover:text-brand transition-colors">
            Average Sale Price
          </Link>
          <CardDescription>Mean sale price per day (all sales averaged)</CardDescription>
        </div>
        <ChartExportButtons chartRef={chartRef} config={exportConfig} />
      </CardHeader>

      <div className="flex items-center justify-between px-3 mb-3">
        <ChartLegendToggle items={legendItems} />
      </div>

      <div ref={chartRef} className="p-3 bg-background-secondary rounded-lg chart-container flex-1 flex flex-col">
        <div className="flex-1 min-h-[320px] sm:min-h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={CHART_MARGINS.default}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray={GRID_STYLE.strokeDasharray} stroke={GRID_STYLE.stroke} vertical={GRID_STYLE.vertical} />
              <XAxis
                dataKey="date"
                stroke={AXIS_STYLE.stroke}
                fontSize={AXIS_STYLE.fontSize}
                tickLine={AXIS_STYLE.tickLine}
                axisLine={AXIS_STYLE.axisLine}
                fontFamily={AXIS_STYLE.fontFamily}
                ticks={getAlignedTicks(chartData.map(d => d.date), 6)}
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                }
              />
              <YAxis
                stroke={AXIS_STYLE.stroke}
                fontSize={AXIS_STYLE.fontSize}
                axisLine={AXIS_STYLE.axisLine}
                tickLine={AXIS_STYLE.tickLine}
                fontFamily={AXIS_STYLE.fontFamily}
                width={40}
                tickFormatter={(value) =>
                  currency === "eth" ? `${value.toFixed(2)}` : `$${value.toFixed(0)}`
                }
              />
              <Tooltip
                contentStyle={getTooltipContentStyle()}
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

      </div>

      <ChartStatGrid columns={2}>
        <ChartStatCard
          label="Current Avg"
          value={currency === "eth" ? formatEth(currentPrice, 2) : formatUsd(currentPrice)}
        />
        <ChartStatCard
          label="Last 7 Days"
          value={currency === "eth" ? formatEth(lastWeekAvg, 2) : formatUsd(lastWeekAvg)}
          change={weekChange}
        />
      </ChartStatGrid>
    </Card>
  );
}
