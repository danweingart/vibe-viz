"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
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
import { useTokenPriceHistory } from "@/hooks/vibestr";
import { useTokenStats } from "@/hooks/vibestr";
import { usePriceHistory } from "@/hooks";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatUsd, formatDate } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import {
  CHART_MARGINS,
  AXIS_STYLE,
  GRID_STYLE,
  getTooltipContentStyle,
} from "@/lib/chartConfig";
import { getChartFilename } from "@/lib/chartExport";

export function PriceVsFloorChart() {
  const { timeRange } = useChartSettings();
  const { data: tokenData, isLoading: tokenLoading, error: tokenError } = useTokenPriceHistory(timeRange);
  const { data: nftData, isLoading: nftLoading } = usePriceHistory(timeRange);
  const { data: stats } = useTokenStats();

  const isLoading = tokenLoading || nftLoading;
  const error = tokenError;

  // Track which series are visible
  const [visibleSeries, setVisibleSeries] = useState({
    tokenPrice: true,
    floorPrice: true,
  });

  const handleLegendToggle = (key: string) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
  };

  // Combine token and NFT data
  const chartData = useMemo(() => {
    if (!tokenData || tokenData.length === 0 || !nftData || nftData.length === 0) return [];

    // Create a map of NFT floor prices by date
    const floorPriceMap = new Map<string, number>();
    nftData.forEach((d) => {
      floorPriceMap.set(d.date, d.minPrice);
    });

    // Combine data
    return tokenData.map((d) => {
      const floorPrice = floorPriceMap.get(d.date) || stats?.floorPrice || 0;
      const floorPriceUsd = floorPrice * (d.priceUsd / (d.price || 1)); // Calculate USD from ETH

      return {
        date: d.date,
        tokenPrice: d.priceUsd,
        floorPrice: floorPriceUsd,
      };
    });
  }, [tokenData, nftData, stats]);

  // Calculate stats
  const currentTokenPrice = chartData[chartData.length - 1]?.tokenPrice || 0;
  const currentFloorPrice = chartData[chartData.length - 1]?.floorPrice || 0;
  const ratio = currentFloorPrice > 0 ? currentTokenPrice / currentFloorPrice : 0;
  const premium = ((ratio - 1) * 100);

  // Calculate correlation (simplified)
  const avgTokenPrice = chartData.reduce((sum, d) => sum + d.tokenPrice, 0) / chartData.length;
  const avgFloorPrice = chartData.reduce((sum, d) => sum + d.floorPrice, 0) / chartData.length;

  // Legend items with active state
  const legendItems: LegendItem[] = [
    {
      key: "tokenPrice",
      label: "Token Price",
      color: CHART_COLORS.primary,
      active: visibleSeries.tokenPrice,
    },
    {
      key: "floorPrice",
      label: "NFT Floor Price",
      color: CHART_COLORS.info,
      active: visibleSeries.floorPrice,
    },
  ];

  // Export configuration
  const exportConfig = useMemo(
    () => ({
      filename: getChartFilename("price-vs-floor", timeRange),
      title: "Token vs Floor Price",
    }),
    [timeRange]
  );

  return (
    <StandardChartCard
      title="Token vs Floor Price"
      description="VIBESTR token price compared to Good Vibes Club floor price"
      legend={legendItems}
      onLegendToggle={handleLegendToggle}
      exportConfig={exportConfig}
      isLoading={isLoading}
      error={error}
      isEmpty={!tokenData || tokenData.length === 0}
      emptyMessage="No price data available"
      stats={
        <ChartStatGrid columns={3}>
          <ChartStatCard
            label="Token Price"
            value={formatUsd(currentTokenPrice, 4)}
          />
          <ChartStatCard
            label="Floor Price"
            value={formatUsd(currentFloorPrice, 0)}
          />
          <ChartStatCard
            label="Ratio"
            value={`${ratio.toFixed(6)}x`}
          />
        </ChartStatGrid>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={CHART_MARGINS.default}>
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
              new Date(v).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            }
          />
          <YAxis
            yAxisId="token"
            stroke={AXIS_STYLE.stroke}
            fontSize={AXIS_STYLE.fontSize}
            fontFamily={AXIS_STYLE.fontFamily}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            width={50}
            tickFormatter={(v) => `$${v.toFixed(4)}`}
          />
          <YAxis
            yAxisId="floor"
            orientation="right"
            stroke={AXIS_STYLE.stroke}
            fontSize={AXIS_STYLE.fontSize}
            fontFamily={AXIS_STYLE.fontFamily}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            width={50}
            tickFormatter={(v) => `$${(v / 1000).toFixed(1)}K`}
          />
          <Tooltip
            contentStyle={getTooltipContentStyle()}
            labelStyle={{ color: "#fafafa" }}
            formatter={(value, name) => {
              if (name === "Token Price") return [formatUsd(Number(value), 4)];
              if (name === "NFT Floor") return [formatUsd(Number(value), 0)];
              return [value];
            }}
            labelFormatter={(label) => formatDate(label)}
          />
          {visibleSeries.tokenPrice && (
            <Line
              yAxisId="token"
              type="monotone"
              dataKey="tokenPrice"
              name="Token Price"
              stroke={CHART_COLORS.primary}
              strokeWidth={2}
              dot={false}
            />
          )}
          {visibleSeries.floorPrice && (
            <Line
              yAxisId="floor"
              type="monotone"
              dataKey="floorPrice"
              name="NFT Floor"
              stroke={CHART_COLORS.info}
              strokeWidth={2}
              dot={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </StandardChartCard>
  );
}
