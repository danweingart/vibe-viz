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
import { useTokenStats } from "@/hooks/vibestr";
import { formatNumber } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import {
  CHART_MARGINS,
  AXIS_STYLE,
  GRID_STYLE,
  getTooltipContentStyle,
} from "@/lib/chartConfig";
import { getChartFilename } from "@/lib/chartExport";

export function TokenHolderDistributionChart() {
  const { data: stats, isLoading, error } = useTokenStats();

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

  // Calculate holder distribution
  const chartData = useMemo(() => {
    if (!stats) return [];

    const totalHolders = stats.holdingsCount;

    // Simulate distribution based on typical token patterns
    // Real implementation would query on-chain data
    const buckets = [
      { range: "< 100", min: 0, max: 100, holders: 0, color: "#a3e635" },
      { range: "100-1K", min: 100, max: 1000, holders: 0, color: "#4ade80" },
      { range: "1K-10K", min: 1000, max: 10000, holders: 0, color: CHART_COLORS.success },
      { range: "10K-100K", min: 10000, max: 100000, holders: 0, color: CHART_COLORS.info },
      { range: "100K-1M", min: 100000, max: 1000000, holders: 0, color: CHART_COLORS.accent },
      { range: "1M-10M", min: 1000000, max: 10000000, holders: 0, color: "#fbbf24" },
      { range: "10M-100M", min: 10000000, max: 100000000, holders: 0, color: "#fb923c" },
      { range: "> 100M", min: 100000000, max: Infinity, holders: 0, color: CHART_COLORS.danger },
    ];

    // Simulate realistic distribution (power law)
    // Most holders have small amounts, few have large amounts
    buckets[0].holders = Math.floor(totalHolders * 0.45); // 45% < 100
    buckets[1].holders = Math.floor(totalHolders * 0.25); // 25% 100-1K
    buckets[2].holders = Math.floor(totalHolders * 0.15); // 15% 1K-10K
    buckets[3].holders = Math.floor(totalHolders * 0.08); // 8% 10K-100K
    buckets[4].holders = Math.floor(totalHolders * 0.04); // 4% 100K-1M
    buckets[5].holders = Math.floor(totalHolders * 0.02); // 2% 1M-10M
    buckets[6].holders = Math.floor(totalHolders * 0.007); // 0.7% 10M-100M
    buckets[7].holders = totalHolders - buckets.slice(0, 7).reduce((sum, b) => sum + b.holders, 0);

    return buckets;
  }, [stats]);

  // Calculate stats
  const totalHolders = chartData.reduce((sum, d) => sum + d.holders, 0);
  const whaleHolders = chartData.slice(-2).reduce((sum, d) => sum + d.holders, 0); // >10M
  const whalePercent = totalHolders > 0 ? (whaleHolders / totalHolders) * 100 : 0;

  // Calculate concentration (Gini coefficient approximation)
  // Higher = more concentrated
  const smallHolders = chartData.slice(0, 3).reduce((sum, d) => sum + d.holders, 0);
  const concentration = totalHolders > 0 ? ((totalHolders - smallHolders) / totalHolders) * 100 : 0;

  // Legend items with active state
  const legendItems: LegendItem[] = [
    {
      key: "distribution",
      label: "Holder Distribution",
      color: CHART_COLORS.primary,
      active: visibleSeries.distribution,
    },
  ];

  // Export configuration
  const exportConfig = useMemo(
    () => ({
      filename: getChartFilename("holder-distribution", 0),
      title: "Token Holder Distribution",
    }),
    []
  );

  return (
    <StandardChartCard
      title="Token Holder Distribution (Simulated)"
      description="Illustrative holder distribution by balance - actual data requires on-chain wallet analysis"
      legend={legendItems}
      onLegendToggle={handleLegendToggle}
      exportConfig={exportConfig}
      isLoading={isLoading}
      error={error}
      isEmpty={!stats}
      emptyMessage="No holder distribution data available"
      stats={
        <ChartStatGrid columns={3}>
          <ChartStatCard
            label="Total Holders"
            value={formatNumber(totalHolders)}
          />
          <ChartStatCard
            label="Whales (>10M)"
            value={`${whalePercent.toFixed(2)}%`}
          />
          <ChartStatCard
            label="Concentration"
            value={`${concentration.toFixed(0)}%`}
          />
        </ChartStatGrid>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={CHART_MARGINS.default}
          layout="vertical"
        >
          <CartesianGrid
            strokeDasharray={GRID_STYLE.strokeDasharray}
            stroke={GRID_STYLE.stroke}
            horizontal={GRID_STYLE.vertical}
            vertical={false}
          />
          <XAxis
            type="number"
            stroke={AXIS_STYLE.stroke}
            fontSize={AXIS_STYLE.fontSize}
            fontFamily={AXIS_STYLE.fontFamily}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
          />
          <YAxis
            type="category"
            dataKey="range"
            stroke={AXIS_STYLE.stroke}
            fontSize={AXIS_STYLE.fontSize}
            fontFamily={AXIS_STYLE.fontFamily}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            width={80}
          />
          <Tooltip
            contentStyle={getTooltipContentStyle()}
            labelStyle={{ color: "#ffffff" }}
            formatter={(value) => [formatNumber(Number(value)), "Holders"]}
          />
          {visibleSeries.distribution && (
            <Bar dataKey="holders" radius={[0, 4, 4, 0]}>
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
