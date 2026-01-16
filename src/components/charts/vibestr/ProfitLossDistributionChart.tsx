"use client";

import { useMemo, useState } from "react";
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
import { ChartStatCard, ChartStatGrid } from "@/components/ui";
import {
  StandardChartCard,
  LegendItem,
} from "@/components/charts/StandardChartCard";
import { useTokenPriceHistory } from "@/hooks/vibestr";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatNumber } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import {
  CHART_MARGINS,
  AXIS_STYLE,
  GRID_STYLE,
  getTooltipContentStyle,
} from "@/lib/chartConfig";
import { getChartFilename } from "@/lib/chartExport";

export function ProfitLossDistributionChart() {
  const { timeRange } = useChartSettings();
  const { data, isLoading, error } = useTokenPriceHistory(timeRange);

  // Track which series are visible
  const [visibleSeries, setVisibleSeries] = useState({
    distribution: true,
  });

  const handleLegendToggle = (key: string) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
  };

  // Calculate P&L distribution
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const currentPrice = data[data.length - 1]?.priceUsd || 0;

    // Create P&L buckets based on entry prices vs current price
    const buckets = [
      { range: "< -50%", min: -100, max: -50, count: 0, color: CHART_COLORS.danger },
      { range: "-50% to -25%", min: -50, max: -25, count: 0, color: "#f87171" },
      { range: "-25% to 0%", min: -25, max: 0, count: 0, color: "#fca5a5" },
      { range: "0% to 25%", min: 0, max: 25, count: 0, color: "#86efac" },
      { range: "25% to 50%", min: 25, max: 50, count: 0, color: "#4ade80" },
      { range: "> 50%", min: 50, max: 1000, count: 0, color: CHART_COLORS.success },
    ];

    // Simulate distribution based on price history
    data.forEach((d) => {
      const entryPrice = d.priceUsd;
      const pnlPercent = entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0;

      const bucket = buckets.find((b) => pnlPercent >= b.min && pnlPercent < b.max);
      if (bucket) {
        bucket.count++;
      }
    });

    return buckets;
  }, [data]);

  // Calculate stats
  const totalCount = chartData.reduce((sum, d) => sum + d.count, 0);
  const profitableCount = chartData
    .filter((d) => d.min >= 0)
    .reduce((sum, d) => sum + d.count, 0);
  const profitablePercent = totalCount > 0 ? (profitableCount / totalCount) * 100 : 0;

  // Calculate actual average P&L from data
  const profitableBuckets = chartData.filter((d) => d.min >= 0);
  const losingBuckets = chartData.filter((d) => d.max < 0);

  const avgProfit = profitableCount > 0
    ? profitableBuckets.reduce((sum, d) => sum + ((d.min + d.max) / 2) * d.count, 0) / profitableCount
    : 0;
  const avgLoss = (totalCount - profitableCount) > 0
    ? losingBuckets.reduce((sum, d) => sum + ((d.min + d.max) / 2) * d.count, 0) / (totalCount - profitableCount)
    : 0;

  // Legend items with active state
  const legendItems: LegendItem[] = [
    {
      key: "distribution",
      label: "P&L Distribution",
      color: CHART_COLORS.primary,
      active: visibleSeries.distribution,
    },
  ];

  // Export configuration
  const exportConfig = useMemo(
    () => ({
      filename: getChartFilename("profit-loss", timeRange),
      title: "Profit/Loss Distribution",
    }),
    [timeRange]
  );

  return (
    <StandardChartCard
      title="Profit/Loss Distribution (Simulated)"
      description="Illustrative P&L distribution if purchases occurred at each historical price"
      legend={legendItems}
      onLegendToggle={handleLegendToggle}
      exportConfig={exportConfig}
      isLoading={isLoading}
      error={error}
      isEmpty={!data || data.length === 0}
      emptyMessage="No P&L data available"
      stats={
        <ChartStatGrid columns={3}>
          <ChartStatCard
            label="Profitable"
            value={`${profitablePercent.toFixed(0)}%`}
          />
          <ChartStatCard
            label="Avg Profit"
            value={`+${avgProfit.toFixed(0)}%`}
          />
          <ChartStatCard
            label="Avg Loss"
            value={`${avgLoss.toFixed(0)}%`}
          />
        </ChartStatGrid>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={CHART_MARGINS.default}>
          <CartesianGrid
            strokeDasharray={GRID_STYLE.strokeDasharray}
            stroke={GRID_STYLE.stroke}
            vertical={GRID_STYLE.vertical}
          />
          <XAxis
            dataKey="range"
            stroke={AXIS_STYLE.stroke}
            fontSize={AXIS_STYLE.fontSize}
            fontFamily={AXIS_STYLE.fontFamily}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            angle={-45}
            textAnchor="end"
            height={60}
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
            labelStyle={{ color: "#fafafa" }}
            formatter={(value) => [formatNumber(Number(value)), "Price Points"]}
          />
          {visibleSeries.distribution && (
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>
    </StandardChartCard>
  );
}
