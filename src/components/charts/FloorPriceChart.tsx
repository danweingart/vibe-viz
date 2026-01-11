"use client";

import { useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import Link from "next/link";
import { Card, CardHeader, CardDescription, ChartLegendToggle, ChartStatCard, ChartStatGrid } from "@/components/ui";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { ChartExportButtons } from "@/components/charts/ChartExportButtons";
import { usePriceHistory } from "@/hooks/usePriceHistory";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatEth, formatUsd, formatDate } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import { CHART_MARGINS, AXIS_STYLE, GRID_STYLE, getTooltipContentStyle } from "@/lib/chartConfig";
import { getChartFilename } from "@/lib/chartExport";

export function FloorPriceChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const { timeRange, currency } = useChartSettings();
  const { data, isLoading, error } = usePriceHistory(timeRange);

  if (isLoading) return <ChartSkeleton />;
  if (error || !data || data.length === 0) {
    return (
      <Card>
        <CardHeader><span className="text-lg font-bold font-brice">Daily Floor Price</span></CardHeader>
        <p className="text-foreground-muted text-center py-8">No data available</p>
      </Card>
    );
  }

  // Calculate 7-day moving average and convert currency
  const chartData = data.map((d, i) => {
    const slice = data.slice(Math.max(0, i - 6), i + 1);
    const ma7 = slice.reduce((sum, s) => sum + s.minPrice, 0) / slice.length;
    const displayFloor = currency === "eth" ? d.minPrice : d.minPrice * d.ethPrice;
    const displayMa7 = currency === "eth" ? ma7 : ma7 * d.ethPrice;
    return { ...d, ma7: displayMa7, displayFloor };
  });

  const currentFloor = chartData[chartData.length - 1]?.displayFloor || 0;
  const avgFloor = chartData.reduce((sum, d) => sum + d.displayFloor, 0) / chartData.length;

  const legendItems = [
    { key: "floor", label: "Floor Price", color: CHART_COLORS.primary },
    { key: "ma7", label: "7D MA", color: CHART_COLORS.info },
  ];

  const exportConfig = {
    filename: getChartFilename("floor-price", timeRange),
    title: "Floor Price",
    subtitle: `${timeRange}D - Lowest sale price each day`,
    legend: [
      { color: CHART_COLORS.primary, label: "Floor Price", value: currency === "eth" ? "ETH" : "USD" },
      { color: CHART_COLORS.info, label: "7D MA", value: currency === "eth" ? "ETH" : "USD" },
    ],
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <Link href="/charts/floor-price" className="text-lg font-bold text-foreground font-brice hover:text-brand transition-colors">
            Floor Price
          </Link>
          <p className="export-branding text-sm text-brand font-mundial">Good Vibes Club</p>
          <CardDescription>Lowest sale price each day + 7D trend line</CardDescription>
        </div>
        <ChartExportButtons chartRef={chartRef} config={exportConfig} />
      </CardHeader>

      <div className="flex items-center justify-between px-3 mb-3">
        <ChartLegendToggle items={legendItems} />
      </div>

      <div ref={chartRef} className="p-3 bg-background-secondary rounded-lg chart-container flex-1 flex flex-col">
        <div className="flex-1 min-h-[320px] sm:min-h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={CHART_MARGINS.default}>
              <CartesianGrid strokeDasharray={GRID_STYLE.strokeDasharray} stroke={GRID_STYLE.stroke} vertical={GRID_STYLE.vertical} />
              <XAxis
                dataKey="date"
                stroke={AXIS_STYLE.stroke}
                fontSize={AXIS_STYLE.fontSize}
                fontFamily={AXIS_STYLE.fontFamily}
                axisLine={AXIS_STYLE.axisLine}
                tickLine={AXIS_STYLE.tickLine}
                interval={Math.max(0, Math.floor(chartData.length / 6) - 1)}
                tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              />
              <YAxis
                stroke={AXIS_STYLE.stroke}
                fontSize={AXIS_STYLE.fontSize}
                fontFamily={AXIS_STYLE.fontFamily}
                axisLine={AXIS_STYLE.axisLine}
                tickLine={AXIS_STYLE.tickLine}
                width={40}
                tickFormatter={(v) => currency === "eth" ? v.toFixed(2) : `$${v.toFixed(0)}`}
              />
              <Tooltip
                contentStyle={getTooltipContentStyle()}
                labelStyle={{ color: "#fafafa" }}
                formatter={(value) => [currency === "eth" ? formatEth(Number(value), 2) : formatUsd(Number(value))]}
                labelFormatter={(label) => formatDate(label)}
              />
              <ReferenceLine y={avgFloor} stroke={CHART_COLORS.muted} strokeDasharray="5 5" />
              <Line type="monotone" dataKey="displayFloor" name="Floor" stroke={CHART_COLORS.primary} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="ma7" name="7D MA" stroke={CHART_COLORS.info} strokeWidth={2} dot={false} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <ChartStatGrid columns={2}>
        <ChartStatCard
          label="Current Floor"
          value={currency === "eth" ? formatEth(currentFloor, 2) : formatUsd(currentFloor)}
        />
        <ChartStatCard
          label={`${timeRange}D Average`}
          value={currency === "eth" ? formatEth(avgFloor, 2) : formatUsd(avgFloor)}
        />
      </ChartStatGrid>
    </Card>
  );
}
