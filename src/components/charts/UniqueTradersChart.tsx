"use client";

import { useMemo, useState } from "react";
import { getChartFilename } from "@/lib/chartExport";
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
import { useTraderAnalysis } from "@/hooks";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatDate, formatNumber } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import { CHART_MARGINS, AXIS_STYLE, GRID_STYLE, getTooltipContentStyle } from "@/lib/chartConfig";
import { CustomLabel } from "@/lib/chartHelpers";

export function UniqueTradersChart() {
  const { timeRange } = useChartSettings();
  const { data, isLoading, error } = useTraderAnalysis(timeRange);

  const [visibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({
    buyers: true,
    sellers: true,
    new: true,
  });

  const handleLegendToggle = (key: string) => {
    setVisibleSeries((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const { chartData, avgBuyers, avgSellers, newBuyerRate, isWeekly } = useMemo(() => {
    if (!data || data.dailyStats.length === 0) {
      return { chartData: [], avgBuyers: 0, avgSellers: 0, newBuyerRate: 0, isWeekly: false };
    }

    const totalBuyers = data.dailyStats.reduce((sum, d) => sum + d.uniqueBuyers, 0);
    const totalSellers = data.dailyStats.reduce((sum, d) => sum + d.uniqueSellers, 0);
    const totalNew = data.dailyStats.reduce((sum, d) => sum + d.newBuyers, 0);
    const totalAll = data.dailyStats.reduce((sum, d) => sum + d.uniqueBuyers, 0);

    // For 30D and 90D, aggregate to weekly data
    const useWeekly = timeRange >= 30;

    let processedData = data.dailyStats;
    if (useWeekly) {
      // Group by week (Sunday start)
      const weeks: Record<string, { date: string; uniqueBuyers: number; uniqueSellers: number; newBuyers: number; count: number }> = {};

      for (const day of data.dailyStats) {
        const date = new Date(day.date);
        // Get Sunday of the week
        const sunday = new Date(date);
        sunday.setDate(date.getDate() - date.getDay());
        const weekKey = sunday.toISOString().split('T')[0];

        if (!weeks[weekKey]) {
          weeks[weekKey] = { date: weekKey, uniqueBuyers: 0, uniqueSellers: 0, newBuyers: 0, count: 0 };
        }
        weeks[weekKey].uniqueBuyers += day.uniqueBuyers;
        weeks[weekKey].uniqueSellers += day.uniqueSellers;
        weeks[weekKey].newBuyers += day.newBuyers;
        weeks[weekKey].count += 1;
      }

      // Convert to array and sort by date
      processedData = Object.values(weeks)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((w) => ({
          date: w.date,
          uniqueBuyers: Math.round(w.uniqueBuyers / w.count), // Weekly average per day
          uniqueSellers: Math.round(w.uniqueSellers / w.count),
          newBuyers: Math.round(w.newBuyers / w.count),
          totalTrades: 0,
          repeatBuyers: 0,
        }));
    }

    return {
      chartData: processedData,
      avgBuyers: totalBuyers / data.dailyStats.length,
      avgSellers: totalSellers / data.dailyStats.length,
      newBuyerRate: totalAll > 0 ? (totalNew / totalAll) * 100 : 0,
      isWeekly: useWeekly,
    };
  }, [data, timeRange]);

  const legendItems: LegendItem[] = [
    { key: "buyers", label: "Buyers", color: CHART_COLORS.success, active: visibleSeries.buyers },
    { key: "sellers", label: "Sellers", color: CHART_COLORS.danger, active: visibleSeries.sellers },
    { key: "new", label: "New", color: CHART_COLORS.info, active: visibleSeries.new },
  ];

  const exportConfig = useMemo(() => ({
    title: "Unique Traders",
    filename: getChartFilename("unique-traders", timeRange),
  }), [timeRange]);

  const statsContent = data ? (
    <ChartStatGrid columns={4}>
      <ChartStatCard
        label="Avg Buyers/Day"
        value={avgBuyers.toFixed(1)}
      />
      <ChartStatCard
        label="Avg Sellers/Day"
        value={avgSellers.toFixed(1)}
      />
      <ChartStatCard
        label="New Buyers"
        value={`${newBuyerRate.toFixed(0)}%`}
      />
      <ChartStatCard
        label="Repeat Buyers"
        value={`${data.repeatBuyerRate}%`}
      />
    </ChartStatGrid>
  ) : null;

  return (
    <StandardChartCard
      title="Unique Traders"
      href="/charts/unique-traders"
      description={`Distinct wallets trading ${isWeekly ? "each week (avg/day)" : "each day"}`}
      legend={legendItems}
      onLegendToggle={handleLegendToggle}
      exportConfig={exportConfig}
      isLoading={isLoading}
      error={error}
      isEmpty={!data || data.dailyStats.length === 0}
      emptyMessage="No trader data available"
      stats={statsContent}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={CHART_MARGINS.default}>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis
            dataKey="date"
            stroke={AXIS_STYLE.stroke}
            fontSize={AXIS_STYLE.fontSize}
            fontFamily={AXIS_STYLE.fontFamily}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            interval={isWeekly ? 0 : Math.max(0, Math.floor(chartData.length / 6) - 1)}
            tickFormatter={(v) => {
              const date = new Date(v);
              if (isWeekly) {
                const endDate = new Date(date);
                endDate.setDate(date.getDate() + 6);
                const startStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                const endStr = endDate.getDate().toString();
                return `${startStr}-${endStr}`;
              }
              return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            }}
          />
          <YAxis
            stroke={AXIS_STYLE.stroke}
            fontSize={AXIS_STYLE.fontSize}
            fontFamily={AXIS_STYLE.fontFamily}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            width={40}
          />
          <Tooltip
            contentStyle={getTooltipContentStyle()}
            labelStyle={{ color: "#ffffff" }}
            formatter={(value, name) => {
              const labels: Record<string, string> = {
                uniqueBuyers: "Unique Buyers",
                uniqueSellers: "Unique Sellers",
                newBuyers: "New Buyers",
              };
              return [formatNumber(Number(value)), labels[name as string] || name];
            }}
            labelFormatter={(l) => {
              if (isWeekly) {
                const date = new Date(l);
                const endDate = new Date(date);
                endDate.setDate(date.getDate() + 6);
                return `${formatDate(l)} - ${formatDate(endDate.toISOString())}`;
              }
              return formatDate(l);
            }}
          />
          {visibleSeries.buyers && (
            <Bar
              dataKey="uniqueBuyers"
              name="uniqueBuyers"
              fill={CHART_COLORS.success}
              radius={[4, 4, 0, 0]}
              opacity={0.8}
              label={(props: any) => (
                <CustomLabel
                  {...props}
                  dataLength={chartData.length}
                  timeRange={timeRange}
                  color={CHART_COLORS.success}
                  formatter={(value: number) => value.toFixed(0)}
                />
              )}
            />
          )}
          {visibleSeries.sellers && (
            <Bar
              dataKey="uniqueSellers"
              name="uniqueSellers"
              fill={CHART_COLORS.danger}
              radius={[4, 4, 0, 0]}
              opacity={0.8}
              label={(props: any) => (
                <CustomLabel
                  {...props}
                  dataLength={chartData.length}
                  timeRange={timeRange}
                  color={CHART_COLORS.danger}
                  formatter={(value: number) => value.toFixed(0)}
                />
              )}
            />
          )}
          {visibleSeries.new && (
            <Line
              type="monotone"
              dataKey="newBuyers"
              name="newBuyers"
              stroke={CHART_COLORS.info}
              strokeWidth={2}
              dot={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </StandardChartCard>
  );
}
