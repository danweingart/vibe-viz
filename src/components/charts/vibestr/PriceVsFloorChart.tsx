"use client";

import { useMemo, useState } from "react";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import { ChartStatCard, ChartStatGrid } from "@/components/ui";
import {
  StandardChartCard,
  LegendItem,
} from "@/components/charts/StandardChartCard";
import { useMarketHistory } from "@/hooks/vibestr/useMarketHistory";
import { usePriceHistory } from "@/hooks/usePriceHistory";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatUsd, formatDate } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import {
  CHART_MARGINS,
  AXIS_STYLE,
  GRID_STYLE,
  getTooltipContentStyle,
  getAlignedTicks,
} from "@/lib/chartConfig";
import { getChartFilename } from "@/lib/chartExport";
import { CustomLabel } from "@/lib/chartHelpers";

interface CombinedDataPoint {
  date: string;
  tokenPrice: number | null;
  floorPrice: number | null;
}

export function PriceVsFloorChart() {
  const { timeRange } = useChartSettings();
  const { data: marketData, isLoading: marketLoading, error: marketError, refetch: marketRefetch } = useMarketHistory();
  const { data: nftData, isLoading: nftLoading, error: nftError, refetch: nftRefetch } = usePriceHistory(timeRange);

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

  const chartData = useMemo<CombinedDataPoint[]>(() => {
    if (!marketData || marketData.length === 0) return [];

    const now = Date.now();
    const cutoff = now - timeRange * 24 * 60 * 60 * 1000;

    // Create a date-keyed map of token prices
    const tokenPriceMap = new Map<string, number>();
    marketData
      .filter((p) => p.timestamp >= cutoff)
      .forEach((point) => {
        const date = new Date(point.timestamp).toISOString().split("T")[0];
        tokenPriceMap.set(date, point.price);
      });

    // Create a date-keyed map of NFT floor prices (in USD)
    const floorPriceMap = new Map<string, number>();
    if (nftData) {
      nftData.forEach((point: { date: string; avgPrice: number; ethUsdPrice?: number }) => {
        const usdPrice = point.avgPrice * (point.ethUsdPrice || 2500);
        floorPriceMap.set(point.date, usdPrice);
      });
    }

    // Get all unique dates and sort
    const allDates = new Set([...tokenPriceMap.keys(), ...floorPriceMap.keys()]);
    const sortedDates = Array.from(allDates).sort();

    return sortedDates.map((date) => ({
      date,
      tokenPrice: tokenPriceMap.get(date) ?? null,
      floorPrice: floorPriceMap.get(date) ?? null,
    }));
  }, [marketData, nftData, timeRange]);

  // Calculate label indices — evenly spaced indices for data labels
  const labelIndices = useMemo(() => {
    if (!chartData || chartData.length === 0) return new Set<number>();
    const count = timeRange === 7 ? 7 : 6;
    if (chartData.length <= count) {
      return new Set(chartData.map((_, i) => i));
    }
    const step = (chartData.length - 1) / (count - 1);
    return new Set(
      Array.from({ length: count }, (_, i) => Math.round(i * step))
    );
  }, [chartData, timeRange]);

  const isLoading = marketLoading || nftLoading;
  const error = marketError || nftError;
  const refetch = () => {
    marketRefetch();
    nftRefetch();
  };

  const currentTokenPrice = chartData.findLast((d) => d.tokenPrice !== null)?.tokenPrice || 0;
  const currentFloorPrice = chartData.findLast((d) => d.floorPrice !== null)?.floorPrice || 0;

  const legendItems: LegendItem[] = [
    { key: "tokenPrice", label: "VIBESTR Price", color: CHART_COLORS.primary, active: visibleSeries.tokenPrice },
    { key: "floorPrice", label: "GVC Floor (USD)", color: CHART_COLORS.success, active: visibleSeries.floorPrice },
  ];

  const exportConfig = useMemo(
    () => ({
      filename: getChartFilename("vibestr-vs-floor", timeRange),
      title: "Token Price vs NFT Floor",
    }),
    [timeRange]
  );

  return (
    <StandardChartCard
      title="Token vs NFT Floor"
      description="VIBESTR token price vs GVC NFT floor price"
      legend={legendItems}
      onLegendToggle={handleLegendToggle}
      exportConfig={exportConfig}
      isLoading={isLoading}
      error={error}
      onRetry={refetch}
      isEmpty={!chartData || chartData.length === 0}
      emptyMessage="No comparison data available"
      stats={
        <ChartStatGrid columns={2}>
          <ChartStatCard label="Token Price" value={formatUsd(currentTokenPrice, 6)} />
          <ChartStatCard label="Floor Price" value={formatUsd(currentFloorPrice, 2)} />
        </ChartStatGrid>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={CHART_MARGINS.default}>
          <CartesianGrid strokeDasharray={GRID_STYLE.strokeDasharray} stroke={GRID_STYLE.stroke} vertical={GRID_STYLE.vertical} />
          <XAxis
            dataKey="date"
            stroke={AXIS_STYLE.stroke}
            fontSize={AXIS_STYLE.fontSize}
            fontFamily={AXIS_STYLE.fontFamily}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            ticks={getAlignedTicks(chartData.map((d) => d.date), 6)}
            tickFormatter={(v) =>
              new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            }
          />
          <YAxis
            yAxisId="token"
            orientation="left"
            stroke={AXIS_STYLE.stroke}
            fontSize={AXIS_STYLE.fontSize}
            fontFamily={AXIS_STYLE.fontFamily}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            width={55}
            tickFormatter={(v) => `$${v < 0.01 ? v.toFixed(5) : v.toFixed(4)}`}
            domain={["auto", "auto"]}
          />
          <YAxis
            yAxisId="floor"
            orientation="right"
            stroke={AXIS_STYLE.stroke}
            fontSize={AXIS_STYLE.fontSize}
            fontFamily={AXIS_STYLE.fontFamily}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            width={55}
            tickFormatter={(v) => `$${v.toFixed(0)}`}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={getTooltipContentStyle()}
            labelStyle={{ color: "#ffffff" }}
            formatter={(value, name) => {
              if (name === "tokenPrice") return [formatUsd(Number(value), 6), "VIBESTR"];
              return [formatUsd(Number(value), 2), "GVC Floor"];
            }}
            labelFormatter={(label) => formatDate(label)}
          />
          {visibleSeries.tokenPrice && (
            <Line
              yAxisId="token"
              type="monotone"
              dataKey="tokenPrice"
              name="tokenPrice"
              stroke={CHART_COLORS.primary}
              strokeWidth={2}
              dot={(props: any) => {
                if (!labelIndices.has(props.index)) return null;
                return <circle {...props} r={3} fill={CHART_COLORS.primary} strokeWidth={0} />;
              }}
              label={(props: any) => {
                if (!labelIndices.has(props.index)) return null;
                return (
                  <CustomLabel
                    {...props}
                    index={0}
                    dataLength={1}
                    color={CHART_COLORS.primary}
                    formatter={(value: number) =>
                      `$${value < 0.01 ? value.toFixed(5) : value.toFixed(4)}`
                    }
                  />
                );
              }}
              connectNulls
            />
          )}
          {visibleSeries.floorPrice && (
            <Line
              yAxisId="floor"
              type="monotone"
              dataKey="floorPrice"
              name="floorPrice"
              stroke={CHART_COLORS.success}
              strokeWidth={2}
              dot={(props: any) => {
                if (!labelIndices.has(props.index)) return null;
                return <circle {...props} r={3} fill={CHART_COLORS.success} strokeWidth={0} />;
              }}
              label={(props: any) => {
                if (!labelIndices.has(props.index)) return null;
                return (
                  <CustomLabel
                    {...props}
                    index={0}
                    dataLength={1}
                    color={CHART_COLORS.success}
                    formatter={(value: number) => `$${value.toFixed(0)}`}
                  />
                );
              }}
              connectNulls
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </StandardChartCard>
  );
}
