"use client";

import { useRef } from "react";
import {
  ComposedChart,
  Bar,
  Line,
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
import { formatDate, formatNumber } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import { CHART_MARGINS, AXIS_STYLE, GRID_STYLE, CHART_HEIGHT, getTooltipContentStyle } from "@/lib/chartConfig";

export function SalesVelocityChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const { timeRange } = useChartSettings();
  const { data, isLoading, error } = usePriceHistory(timeRange);

  if (isLoading) return <ChartSkeleton />;
  if (error || !data || data.length === 0) {
    return (
      <Card>
        <CardHeader><span className="text-lg font-bold font-brice">Daily Sales Count</span></CardHeader>
        <p className="text-foreground-muted text-center py-8">No data available</p>
      </Card>
    );
  }

  // Calculate 7-day rolling average
  const chartData = data.map((d, i) => {
    const slice = data.slice(Math.max(0, i - 6), i + 1);
    const ma7 = slice.reduce((sum, s) => sum + s.salesCount, 0) / slice.length;
    return { ...d, ma7: Math.round(ma7 * 10) / 10 };
  });

  const totalSales = data.reduce((sum, d) => sum + d.salesCount, 0);
  const avgDaily = totalSales / data.length;

  const legendItems = [
    { key: "sales", label: "Daily Sales", color: CHART_COLORS.primary },
    { key: "ma7", label: "7D Avg", color: CHART_COLORS.danger },
  ];

  const lastWeek = chartData.slice(-7);
  const prevWeek = chartData.slice(-14, -7);
  const lastWeekTotal = lastWeek.reduce((sum, d) => sum + d.salesCount, 0);
  const prevWeekTotal = prevWeek.reduce((sum, d) => sum + d.salesCount, 0);
  const weekChange = prevWeekTotal > 0 ? ((lastWeekTotal - prevWeekTotal) / prevWeekTotal) * 100 : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between p-3">
        <div>
          <Link href="/charts/sales-velocity" className="text-lg font-bold text-foreground font-brice hover:text-brand transition-colors">
            Sales Velocity
          </Link>
          <p className="export-branding hidden text-sm text-brand font-mundial">Good Vibes Club</p>
          <CardDescription>Number of sales per day with 7D moving average</CardDescription>
        </div>
        <ChartExportButtons
          chartRef={chartRef}
          config={{
            title: "Sales Velocity",
            subtitle: `${timeRange}D Activity`,
            filename: `sales-velocity-${timeRange}d`,
            legend: [
              { color: CHART_COLORS.primary, label: "Daily Sales", value: "count" },
              { color: CHART_COLORS.danger, label: "7D Avg", value: "count" },
            ],
          }}
        />
      </CardHeader>

      <div className="flex items-center px-3 mb-3">
        <ChartLegendToggle items={legendItems} />
      </div>

      <div ref={chartRef} className="px-3 py-3 bg-background-secondary rounded-lg chart-container">
        <div style={{ minHeight: CHART_HEIGHT.dashboard }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={CHART_MARGINS.default}>
              <CartesianGrid strokeDasharray={GRID_STYLE.strokeDasharray} stroke={GRID_STYLE.stroke} vertical={GRID_STYLE.vertical} />
              <XAxis
                dataKey="date"
                stroke={AXIS_STYLE.stroke}
                fontSize={AXIS_STYLE.fontSize}
                axisLine={AXIS_STYLE.axisLine}
                tickLine={AXIS_STYLE.tickLine}
                interval={Math.max(0, Math.floor(chartData.length / 6) - 1)}
                tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              />
              <YAxis stroke={AXIS_STYLE.stroke} fontSize={AXIS_STYLE.fontSize} axisLine={AXIS_STYLE.axisLine} tickLine={AXIS_STYLE.tickLine} />
              <Tooltip
                contentStyle={getTooltipContentStyle()}
                labelStyle={{ color: "#fafafa" }}
                formatter={(value, name) => [formatNumber(Number(value)), name === "salesCount" ? "Sales" : "7D Avg"]}
                labelFormatter={(label) => formatDate(label)}
              />
              <Bar dataKey="salesCount" name="Daily Sales" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} opacity={0.8} />
              <Line type="monotone" dataKey="ma7" name="7D Average" stroke={CHART_COLORS.danger} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <ChartStatGrid columns={2}>
        <ChartStatCard
          label={`${timeRange}D Total`}
          value={formatNumber(totalSales)}
          subValue={`${avgDaily.toFixed(1)}/day`}
        />
        <ChartStatCard
          label="Last 7 Days"
          value={formatNumber(lastWeekTotal)}
          change={weekChange}
        />
      </ChartStatGrid>
    </Card>
  );
}
