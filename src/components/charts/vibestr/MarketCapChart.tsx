"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartStatCard, ChartStatGrid } from "@/components/ui";
import { StandardChartCard } from "@/components/charts/StandardChartCard";
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

export function MarketCapChart() {
  const { timeRange } = useChartSettings();
  const { data: rawData, isLoading, error, refetch } = useMarketHistory();

  const chartData = useMemo(() => {
    if (!rawData || rawData.length === 0) return [];

    const now = Date.now();
    const cutoff = now - timeRange * 24 * 60 * 60 * 1000;
    const filtered = rawData.filter((p) => p.timestamp >= cutoff);

    return filtered.map((point) => ({
      date: new Date(point.timestamp).toISOString().split("T")[0],
      marketCap: point.marketCap,
    }));
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

  const currentMC = chartData[chartData.length - 1]?.marketCap || 0;
  const firstMC = chartData[0]?.marketCap || 0;
  const mcChange = firstMC > 0 ? ((currentMC - firstMC) / firstMC) * 100 : 0;
  const highMC = chartData.length > 0 ? Math.max(...chartData.map((d) => d.marketCap)) : 0;

  const exportConfig = useMemo(
    () => ({
      filename: getChartFilename("vibestr-marketcap", timeRange),
      title: "VIBESTR Market Cap",
    }),
    [timeRange]
  );

  return (
    <StandardChartCard
      title="Market Cap"
      description="VIBESTR fully diluted market capitalization"
      exportConfig={exportConfig}
      isLoading={isLoading}
      error={error}
      onRetry={refetch}
      isEmpty={!chartData || chartData.length === 0}
      emptyMessage="No market cap data available"
      stats={
        <ChartStatGrid columns={3}>
          <ChartStatCard label="Current" value={formatUsd(currentMC, 0)} />
          <ChartStatCard
            label={`${timeRange}D Change`}
            value={`${mcChange > 0 ? "+" : ""}${mcChange.toFixed(1)}%`}
            change={mcChange}
          />
          <ChartStatCard label="ATH" value={formatUsd(highMC, 0)} />
        </ChartStatGrid>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={CHART_MARGINS.default}>
          <defs>
            <linearGradient id="mcGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.accent} stopOpacity={0.3} />
              <stop offset="95%" stopColor={CHART_COLORS.accent} stopOpacity={0} />
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
            tickFormatter={(v) => {
              if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
              if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
              return `$${v}`;
            }}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={getTooltipContentStyle()}
            labelStyle={{ color: "#ffffff" }}
            formatter={(value) => [formatUsd(Number(value), 0), "Market Cap"]}
            labelFormatter={(label) => formatDate(label)}
          />
          <Area
            type="monotone"
            dataKey="marketCap"
            stroke={CHART_COLORS.accent}
            strokeWidth={2}
            fill="url(#mcGradient)"
            dot={(props: any) => {
              if (!labelIndices.has(props.index)) return null;
              return <circle {...props} r={3} fill={CHART_COLORS.accent} strokeWidth={0} />;
            }}
            activeDot={{ r: 5, fill: CHART_COLORS.accent, stroke: "#0a0a0a", strokeWidth: 2 }}
            label={(props: any) => {
              if (!labelIndices.has(props.index)) return null;
              return (
                <CustomLabel
                  {...props}
                  index={0}
                  dataLength={1}
                  color={CHART_COLORS.accent}
                  formatter={(value: number) => {
                    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
                    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
                    return `$${value.toFixed(0)}`;
                  }}
                />
              );
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </StandardChartCard>
  );
}
