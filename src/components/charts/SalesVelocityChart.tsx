"use client";

import { useMemo, useState } from "react";
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
import { ChartStatCard, ChartStatGrid } from "@/components/ui";
import { StandardChartCard, LegendItem } from "@/components/charts/StandardChartCard";
import { usePriceHistory } from "@/hooks/usePriceHistory";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatDate, formatNumber } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import { CHART_MARGINS, AXIS_STYLE, GRID_STYLE, getTooltipContentStyle } from "@/lib/chartConfig";
import { getChartFilename } from "@/lib/chartExport";

export function SalesVelocityChart() {
  const { timeRange } = useChartSettings();
  const { data, isLoading, error } = usePriceHistory(timeRange);

  // Track which series are visible
  const [visibleSeries, setVisibleSeries] = useState({
    sales: true,
    ma7: true,
  });

  const handleLegendToggle = (key: string) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
  };

  // Calculate chart data with 7-day rolling average
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.map((d, i) => {
      const slice = data.slice(Math.max(0, i - 6), i + 1);
      const ma7 = slice.reduce((sum, s) => sum + s.salesCount, 0) / slice.length;
      return { ...d, ma7: Math.round(ma7 * 10) / 10 };
    });
  }, [data]);

  // Calculate stats
  const totalSales = data?.reduce((sum, d) => sum + d.salesCount, 0) || 0;
  const avgDaily = data && data.length > 0 ? totalSales / data.length : 0;

  const lastWeek = chartData.slice(-7);
  const prevWeek = chartData.slice(-14, -7);
  const lastWeekTotal = lastWeek.reduce((sum, d) => sum + d.salesCount, 0);
  const prevWeekTotal = prevWeek.reduce((sum, d) => sum + d.salesCount, 0);
  const weekChange = prevWeekTotal > 0 ? ((lastWeekTotal - prevWeekTotal) / prevWeekTotal) * 100 : 0;

  // Legend items with active state
  const legendItems: LegendItem[] = [
    { key: "sales", label: "Daily Sales", color: CHART_COLORS.primary, active: visibleSeries.sales },
    { key: "ma7", label: "7D Avg", color: CHART_COLORS.danger, active: visibleSeries.ma7 },
  ];

  // Export configuration
  const exportConfig = useMemo(() => ({
    filename: getChartFilename("sales-velocity", timeRange),
    title: "Sales Velocity",
    subtitle: `${timeRange}D - Number of sales per day`,
    legend: [
      { color: CHART_COLORS.primary, label: "Daily Sales", value: "count" },
      { color: CHART_COLORS.danger, label: "7D Avg", value: "count" },
    ],
  }), [timeRange]);

  return (
    <StandardChartCard
      title="Sales Velocity"
      href="/charts/sales-velocity"
      description="Number of sales per day with 7D moving average"
      legend={legendItems}
      onLegendToggle={handleLegendToggle}
      exportConfig={exportConfig}
      isLoading={isLoading}
      error={error}
      isEmpty={!data || data.length === 0}
      emptyMessage="No sales velocity data available"
      stats={
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
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={CHART_MARGINS.default}>
          <CartesianGrid
            strokeDasharray={GRID_STYLE.strokeDasharray}
            stroke={GRID_STYLE.stroke}
            vertical={GRID_STYLE.vertical}
          />
          <XAxis
            dataKey="date"
            stroke={AXIS_STYLE.stroke}
            fontSize={AXIS_STYLE.fontSize}
            fontFamily={AXIS_STYLE.fontFamily}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            interval={Math.max(0, Math.floor(chartData.length / 6) - 1)}
            tickFormatter={(v) =>
              new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            }
          />
          <YAxis
            stroke={AXIS_STYLE.stroke}
            fontSize={AXIS_STYLE.fontSize}
            fontFamily={AXIS_STYLE.fontFamily}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
          />
          <Tooltip
            contentStyle={getTooltipContentStyle()}
            labelStyle={{ color: "#fafafa" }}
            formatter={(value, name) => [
              formatNumber(Number(value)),
              name === "salesCount" ? "Sales" : "7D Avg",
            ]}
            labelFormatter={(label) => formatDate(label)}
          />
          {visibleSeries.sales && (
            <Bar
              dataKey="salesCount"
              name="Daily Sales"
              fill={CHART_COLORS.primary}
              radius={[4, 4, 0, 0]}
              opacity={0.8}
            />
          )}
          {visibleSeries.ma7 && (
            <Line
              type="monotone"
              dataKey="ma7"
              name="7D Average"
              stroke={CHART_COLORS.danger}
              strokeWidth={2}
              dot={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </StandardChartCard>
  );
}
