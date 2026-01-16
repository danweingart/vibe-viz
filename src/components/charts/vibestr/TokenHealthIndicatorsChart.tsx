"use client";

import { useMemo, useState } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { ChartStatCard, ChartStatGrid } from "@/components/ui";
import {
  StandardChartCard,
  LegendItem,
} from "@/components/charts/StandardChartCard";
import { useTokenStats, useTokenPriceHistory } from "@/hooks/vibestr";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { CHART_COLORS } from "@/lib/constants";
import {
  CHART_MARGINS,
  AXIS_STYLE,
  getTooltipContentStyle,
} from "@/lib/chartConfig";
import { getChartFilename } from "@/lib/chartExport";

export function TokenHealthIndicatorsChart() {
  const { timeRange } = useChartSettings();
  const { data: stats, isLoading: statsLoading, error } = useTokenStats();
  const { data: priceHistory, isLoading: priceLoading } = useTokenPriceHistory(timeRange);

  const isLoading = statsLoading || priceLoading;

  // Track which series are visible
  const [visibleSeries, setVisibleSeries] = useState({
    health: true,
  });

  const handleLegendToggle = (key: string) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
  };

  // Calculate health metrics
  const chartData = useMemo(() => {
    if (!stats || !priceHistory || priceHistory.length === 0) return [];

    // Liquidity Score (0-100): Based on liquidity vs market cap
    const liquidityRatio = stats.marketCap > 0 ? stats.liquidity / stats.marketCap : 0;
    const liquidityScore = Math.min(100, liquidityRatio * 500); // 20% liquidity = 100 score

    // Holder Diversity Score (0-100): Based on holder count
    const holderScore = Math.min(100, (stats.holdingsCount / 1000) * 100);

    // Volume Trend (0-100): Based on volume consistency
    const avgVolume = stats.volume24h;
    const volumeScore = Math.min(100, (avgVolume / 1000000) * 100); // $1M = 100 score

    // Price Stability (0-100): Inverse of volatility
    const volatilities = priceHistory
      .filter((d) => d.volatility !== undefined)
      .map((d) => d.volatility || 0);
    const avgVolatility = volatilities.length > 0
      ? volatilities.reduce((sum, v) => sum + v, 0) / volatilities.length
      : 0;
    const stabilityScore = Math.max(0, 100 - avgVolatility * 2);

    // Burn Progress (0-100): Based on burn percentage
    const burnScore = Math.min(100, stats.burnedPercent * 5); // 20% burned = 100 score

    return [
      { metric: "Liquidity", value: liquidityScore, fullMark: 100 },
      { metric: "Holders", value: holderScore, fullMark: 100 },
      { metric: "Volume", value: volumeScore, fullMark: 100 },
      { metric: "Stability", value: stabilityScore, fullMark: 100 },
      { metric: "Burn Rate", value: burnScore, fullMark: 100 },
    ];
  }, [stats, priceHistory]);

  // Calculate overall health score
  const overallHealth = chartData.length > 0
    ? chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length
    : 0;

  // Determine health status
  const healthStatus = overallHealth >= 70 ? "Excellent" : overallHealth >= 50 ? "Good" : overallHealth >= 30 ? "Fair" : "Poor";
  const healthColor = overallHealth >= 70 ? CHART_COLORS.success : overallHealth >= 50 ? CHART_COLORS.primary : overallHealth >= 30 ? CHART_COLORS.accent : CHART_COLORS.danger;

  // Legend items with active state
  const legendItems: LegendItem[] = [
    {
      key: "health",
      label: "Health Metrics",
      color: CHART_COLORS.primary,
      active: visibleSeries.health,
    },
  ];

  // Export configuration
  const exportConfig = useMemo(
    () => ({
      filename: getChartFilename("token-health", 0),
      title: "Token Health Indicators",
    }),
    []
  );

  return (
    <StandardChartCard
      title="Token Health Indicators"
      description="Health scores: Liquidity (20% = 100), Holders (1K = 100), Volume ($1M = 100), Stability (inverse volatility), Burn (20% = 100)"
      legend={legendItems}
      onLegendToggle={handleLegendToggle}
      exportConfig={exportConfig}
      isLoading={isLoading}
      error={error}
      isEmpty={!stats}
      emptyMessage="No health data available"
      stats={
        <ChartStatGrid columns={2}>
          <ChartStatCard
            label="Overall Health"
            value={`${overallHealth.toFixed(0)}/100`}
          />
          <ChartStatCard
            label="Status"
            value={healthStatus}
          />
        </ChartStatGrid>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={chartData} margin={{ ...CHART_MARGINS.default, top: 20, bottom: 20 }}>
          <PolarGrid stroke={AXIS_STYLE.stroke} />
          <PolarAngleAxis
            dataKey="metric"
            stroke={AXIS_STYLE.stroke}
            tick={{ fill: AXIS_STYLE.stroke, fontSize: AXIS_STYLE.fontSize }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            stroke={AXIS_STYLE.stroke}
            tick={{ fill: AXIS_STYLE.stroke, fontSize: AXIS_STYLE.fontSize }}
          />
          {visibleSeries.health && (
            <Radar
              name="Health Score"
              dataKey="value"
              stroke={CHART_COLORS.primary}
              fill={CHART_COLORS.primary}
              fillOpacity={0.3}
              strokeWidth={2}
            />
          )}
        </RadarChart>
      </ResponsiveContainer>
    </StandardChartCard>
  );
}
