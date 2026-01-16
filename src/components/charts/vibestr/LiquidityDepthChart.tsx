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
} from "recharts";
import { ChartStatCard, ChartStatGrid } from "@/components/ui";
import {
  StandardChartCard,
  LegendItem,
} from "@/components/charts/StandardChartCard";
import { useTokenStats } from "@/hooks/vibestr";
import { formatUsd } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import {
  CHART_MARGINS,
  AXIS_STYLE,
  GRID_STYLE,
  getTooltipContentStyle,
} from "@/lib/chartConfig";
import { getChartFilename } from "@/lib/chartExport";

export function LiquidityDepthChart() {
  const { data: stats, isLoading, error } = useTokenStats();

  // Track which series are visible
  const [visibleSeries, setVisibleSeries] = useState({
    liquidity: true,
  });

  const handleLegendToggle = (key: string) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
  };

  // Generate liquidity depth data (simplified visualization)
  const chartData = useMemo(() => {
    if (!stats) return [];

    const currentPrice = stats.priceUsd;
    const liquidity = stats.liquidity;

    // Create price levels around current price
    const levels = [];
    for (let i = -5; i <= 5; i++) {
      const priceMultiplier = 1 + i * 0.02; // ±2% per level
      const priceLevel = currentPrice * priceMultiplier;
      // Simulate liquidity depth (more liquidity closer to current price)
      const depthMultiplier = 1 - Math.abs(i) * 0.15;
      const liquidityAtLevel = (liquidity * depthMultiplier) / 11; // Divide total by levels

      levels.push({
        price: priceLevel,
        liquidity: liquidityAtLevel,
        label: i === 0 ? "Current" : `${i > 0 ? "+" : ""}${(i * 2).toFixed(0)}%`,
      });
    }

    return levels;
  }, [stats]);

  // Calculate stats
  const totalLiquidity = stats?.liquidity || 0;
  const depthScore = totalLiquidity > 1000000 ? 100 : (totalLiquidity / 1000000) * 100;

  // Legend items with active state
  const legendItems: LegendItem[] = [
    {
      key: "liquidity",
      label: "Available Liquidity",
      color: CHART_COLORS.info,
      active: visibleSeries.liquidity,
    },
  ];

  // Export configuration
  const exportConfig = useMemo(
    () => ({
      filename: getChartFilename("liquidity-depth", 0),
      title: "Liquidity Depth",
    }),
    []
  );

  return (
    <StandardChartCard
      title="Liquidity Depth (Simulated)"
      description="Illustrative order book distribution - actual data requires DEX aggregator integration"
      legend={legendItems}
      onLegendToggle={handleLegendToggle}
      exportConfig={exportConfig}
      isLoading={isLoading}
      error={error}
      isEmpty={!stats}
      emptyMessage="No liquidity data available"
      stats={
        <ChartStatGrid columns={2}>
          <ChartStatCard
            label="Total Liquidity"
            value={formatUsd(totalLiquidity, 0)}
          />
          <ChartStatCard
            label="Depth Score"
            value={`${depthScore.toFixed(0)}/100`}
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
            dataKey="label"
            stroke={AXIS_STYLE.stroke}
            fontSize={AXIS_STYLE.fontSize}
            fontFamily={AXIS_STYLE.fontFamily}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
          />
          <YAxis
            stroke={AXIS_STYLE.stroke}
            fontSize={AXIS_STYLE.fontSize}
            fontFamily={AXIS_STYLE.fontFamily}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            width={50}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
          />
          <Tooltip
            contentStyle={getTooltipContentStyle()}
            labelStyle={{ color: "#fafafa" }}
            formatter={(value) => [formatUsd(Number(value), 0), "Liquidity"]}
          />
          {visibleSeries.liquidity && (
            <Bar
              dataKey="liquidity"
              fill={CHART_COLORS.info}
              radius={[4, 4, 0, 0]}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </StandardChartCard>
  );
}
