"use client";

import { useMemo, useState } from "react";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from "recharts";
import { ChartStatCard, ChartStatGrid } from "@/components/ui";
import {
  StandardChartCard,
  LegendItem,
} from "@/components/charts/StandardChartCard";
import { useMarketHistory } from "@/hooks/vibestr/useMarketHistory";
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

export function TokenPriceChart() {
  const { timeRange } = useChartSettings();
  const { data: rawData, isLoading, error, refetch } = useMarketHistory();

  const [visibleSeries, setVisibleSeries] = useState({
    price: true,
    ma7: true,
  });

  const handleLegendToggle = (key: string) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
  };

  // Filter and process data based on time range
  const chartData = useMemo(() => {
    if (!rawData || rawData.length === 0) return [];

    const now = Date.now();
    const cutoff = now - timeRange * 24 * 60 * 60 * 1000;
    const filtered = rawData.filter((p) => p.timestamp >= cutoff);

    // Calculate 7-point moving average
    return filtered.map((point, i) => {
      const start = Math.max(0, i - 6);
      const slice = filtered.slice(start, i + 1);
      const ma7 = slice.reduce((sum, p) => sum + p.price, 0) / slice.length;

      return {
        date: new Date(point.timestamp).toISOString().split("T")[0],
        price: point.price,
        ma7,
      };
    });
  }, [rawData, timeRange]);

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

  // Stats
  const currentPrice = chartData[chartData.length - 1]?.price || 0;
  const firstPrice = chartData[0]?.price || 0;
  const priceChange = firstPrice > 0 ? ((currentPrice - firstPrice) / firstPrice) * 100 : 0;
  const highPrice = chartData.length > 0 ? Math.max(...chartData.map((d) => d.price)) : 0;
  const lowPrice = chartData.length > 0 ? Math.min(...chartData.map((d) => d.price)) : 0;

  const legendItems: LegendItem[] = [
    { key: "price", label: "Token Price", color: CHART_COLORS.primary, active: visibleSeries.price },
    { key: "ma7", label: "7-Point MA", color: CHART_COLORS.info, active: visibleSeries.ma7, lineStyle: "dashed" },
  ];

  const exportConfig = useMemo(
    () => ({
      filename: getChartFilename("vibestr-price", timeRange),
      title: "VIBESTR Token Price",
    }),
    [timeRange]
  );

  return (
    <StandardChartCard
      title="Token Price"
      description="VIBESTR token price history from CoinGecko"
      legend={legendItems}
      onLegendToggle={handleLegendToggle}
      exportConfig={exportConfig}
      isLoading={isLoading}
      error={error}
      onRetry={refetch}
      isEmpty={!chartData || chartData.length === 0}
      emptyMessage="No price data available"
      stats={
        <ChartStatGrid columns={4}>
          <ChartStatCard label="Current" value={formatUsd(currentPrice, 6)} />
          <ChartStatCard
            label={`${timeRange}D Change`}
            value={`${priceChange > 0 ? "+" : ""}${priceChange.toFixed(1)}%`}
            change={priceChange}
          />
          <ChartStatCard label="High" value={formatUsd(highPrice, 6)} />
          <ChartStatCard label="Low" value={formatUsd(lowPrice, 6)} />
        </ChartStatGrid>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={CHART_MARGINS.default}>
          <defs>
            <linearGradient id="vibestrPriceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
              <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
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
            stroke={AXIS_STYLE.stroke}
            fontSize={AXIS_STYLE.fontSize}
            fontFamily={AXIS_STYLE.fontFamily}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            width={55}
            tickFormatter={(v) => `$${v < 0.01 ? v.toFixed(5) : v.toFixed(4)}`}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={getTooltipContentStyle()}
            labelStyle={{ color: "#ffffff" }}
            formatter={(value) => [formatUsd(Number(value), 6)]}
            labelFormatter={(label) => formatDate(label)}
          />
          {visibleSeries.price && (
            <>
              <Area type="monotone" dataKey="price" fill="url(#vibestrPriceGradient)" stroke="none" />
              <Line
                type="monotone"
                dataKey="price"
                name="Price"
                stroke={CHART_COLORS.primary}
                strokeWidth={2}
                dot={(props: any) => {
                  const { index } = props;
                  if (!labelIndices.has(index)) return null;
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
              />
            </>
          )}
          {visibleSeries.ma7 && (
            <Line type="monotone" dataKey="ma7" name="7-Pt MA" stroke={CHART_COLORS.info} strokeWidth={2} strokeDasharray="5 5" dot={false} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </StandardChartCard>
  );
}
