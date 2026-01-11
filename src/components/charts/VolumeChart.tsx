"use client";

import { useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Link from "next/link";
import { Card, CardHeader, CardDescription, ChartLegendToggle, ChartStatCard, ChartStatGrid } from "@/components/ui";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { ChartExportButtons } from "@/components/charts/ChartExportButtons";
import { usePriceHistory } from "@/hooks/usePriceHistory";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatEth, formatUsd, formatDate } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import { CHART_MARGINS, AXIS_STYLE, GRID_STYLE, CHART_HEIGHT, getTooltipContentStyle } from "@/lib/chartConfig";

export function VolumeChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const { timeRange, currency } = useChartSettings();
  const { data, isLoading, error } = usePriceHistory(timeRange);

  const exportConfig = {
    title: "Trading Volume",
    subtitle: `${timeRange}D Total ETH Traded`,
    filename: `gvc-volume-${timeRange}d`,
    legend: [
      { color: CHART_COLORS.primary, label: "Daily Volume", value: "ETH" },
      { color: CHART_COLORS.danger, label: "7D MA", value: "ETH" },
    ],
  };

  if (isLoading) return <ChartSkeleton />;
  if (error || !data || data.length === 0) {
    return (
      <Card>
        <CardHeader><span className="text-lg font-bold font-brice">Daily Trading Volume</span></CardHeader>
        <p className="text-foreground-muted text-center py-8">No data available</p>
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    displayVolume: currency === "eth" ? d.volume : d.volumeUsd,
  }));

  const totalVolume = chartData.reduce((sum, d) => sum + d.displayVolume, 0);

  const legendItems = [
    { key: "volume", label: "Daily Volume", color: CHART_COLORS.primary },
  ];

  const dailyAvg = totalVolume / data.length;
  const lastWeek = chartData.slice(-7);
  const prevWeek = chartData.slice(-14, -7);
  const lastWeekTotal = lastWeek.reduce((sum, d) => sum + d.displayVolume, 0);
  const prevWeekTotal = prevWeek.reduce((sum, d) => sum + d.displayVolume, 0);
  const weekChange = prevWeekTotal > 0 ? ((lastWeekTotal - prevWeekTotal) / prevWeekTotal) * 100 : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <Link href="/charts/volume" className="text-lg font-bold text-foreground font-brice hover:text-brand transition-colors">
            Trading Volume
          </Link>
          <p className="export-branding hidden text-sm text-brand font-mundial">Good Vibes Club</p>
          <CardDescription>Total ETH traded per day</CardDescription>
        </div>
        <ChartExportButtons chartRef={chartRef} config={exportConfig} />
      </CardHeader>

      <div className="flex items-center px-3 mb-3">
        <ChartLegendToggle items={legendItems} />
      </div>

      <div ref={chartRef} className="px-3 py-3 bg-background-secondary rounded-lg chart-container">
        <div style={{ minHeight: CHART_HEIGHT.dashboard }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={CHART_MARGINS.default}>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis
                dataKey="date"
                stroke={AXIS_STYLE.stroke}
                fontSize={AXIS_STYLE.fontSize}
                axisLine={AXIS_STYLE.axisLine}
                tickLine={AXIS_STYLE.tickLine}
                interval={Math.max(0, Math.floor(chartData.length / 6) - 1)}
                tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              />
              <YAxis
                stroke={AXIS_STYLE.stroke}
                fontSize={AXIS_STYLE.fontSize}
                axisLine={AXIS_STYLE.axisLine}
                tickLine={AXIS_STYLE.tickLine}
                tickFormatter={(v) => currency === "eth" ? `${v.toFixed(1)}` : `$${(v/1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={getTooltipContentStyle()}
                labelStyle={{ color: "#fafafa" }}
                formatter={(value) => [currency === "eth" ? formatEth(Number(value), 2) : formatUsd(Number(value)), "Volume"]}
                labelFormatter={(label) => formatDate(label)}
              />
              <Bar dataKey="displayVolume" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <ChartStatGrid columns={2}>
        <ChartStatCard
          label={`${timeRange}D Total`}
          value={currency === "eth" ? formatEth(totalVolume, 1) : formatUsd(totalVolume)}
          subValue={currency === "eth" ? `${formatEth(dailyAvg, 2)}/day` : `${formatUsd(dailyAvg)}/day`}
        />
        <ChartStatCard
          label="Last 7 Days"
          value={currency === "eth" ? formatEth(lastWeekTotal, 1) : formatUsd(lastWeekTotal)}
          change={weekChange}
        />
      </ChartStatGrid>
    </Card>
  );
}
