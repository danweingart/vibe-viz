"use client";

import { useMemo, useState } from "react";
import {
  ComposedChart,
  Area,
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
import { useBurnHistory } from "@/hooks/vibestr";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatDate, formatNumber } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import {
  CHART_MARGINS,
  AXIS_STYLE,
  GRID_STYLE,
  getTooltipContentStyle,
} from "@/lib/chartConfig";
import { getChartFilename } from "@/lib/chartExport";

export function BurnProgressChart() {
  const { timeRange } = useChartSettings();
  const { data, isLoading, error } = useBurnHistory(timeRange);

  // Track which series are visible
  const [visibleSeries, setVisibleSeries] = useState({
    cumulative: true,
    rate: true,
  });

  const handleLegendToggle = (key: string) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
  };

  // Calculate chart data
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.map((d) => ({
      date: d.date,
      cumulative: d.cumulativeBurned / 1e9, // Convert to billions
      rate: d.burnRate / 1e9, // Convert to billions per day
      percent: d.burnedPercent,
    }));
  }, [data]);

  // Calculate stats
  const totalBurned = chartData[chartData.length - 1]?.cumulative || 0;
  const burnRate = chartData[chartData.length - 1]?.rate || 0;
  const burnPercent = chartData[chartData.length - 1]?.percent || 0;

  // Legend items with active state
  const legendItems: LegendItem[] = [
    {
      key: "cumulative",
      label: "Cumulative Burned",
      color: CHART_COLORS.primary,
      active: visibleSeries.cumulative,
    },
    {
      key: "rate",
      label: "Burn Rate",
      color: CHART_COLORS.danger,
      active: visibleSeries.rate,
    },
  ];

  // Export configuration
  const exportConfig = useMemo(
    () => ({
      filename: getChartFilename("burn-progress", timeRange),
      title: "Burn Progress",
    }),
    [timeRange]
  );

  return (
    <StandardChartCard
      title="Burn Progress"
      description="Cumulative tokens burned and daily burn rate"
      legend={legendItems}
      onLegendToggle={handleLegendToggle}
      exportConfig={exportConfig}
      isLoading={isLoading}
      error={error}
      isEmpty={!data || data.length === 0}
      emptyMessage="No burn data available"
      stats={
        <ChartStatGrid columns={3}>
          <ChartStatCard
            label="Total Burned"
            value={`${totalBurned.toFixed(1)}B`}
          />
          <ChartStatCard label="Burn Rate" value={`${burnRate.toFixed(2)}B/day`} />
          <ChartStatCard
            label="% of Supply"
            value={`${burnPercent.toFixed(1)}%`}
          />
        </ChartStatGrid>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={CHART_MARGINS.default}>
          <defs>
            <linearGradient id="burnGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
              <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
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
            yAxisId="cumulative"
            stroke={AXIS_STYLE.stroke}
            fontSize={AXIS_STYLE.fontSize}
            fontFamily={AXIS_STYLE.fontFamily}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            width={50}
            tickFormatter={(v) => `${v.toFixed(0)}B`}
          />
          <YAxis
            yAxisId="rate"
            orientation="right"
            stroke={AXIS_STYLE.stroke}
            fontSize={AXIS_STYLE.fontSize}
            fontFamily={AXIS_STYLE.fontFamily}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            width={50}
            tickFormatter={(v) => `${v.toFixed(1)}`}
          />
          <Tooltip
            contentStyle={getTooltipContentStyle()}
            labelStyle={{ color: "#fafafa" }}
            formatter={(value, name) => {
              if (name === "Cumulative") return [`${Number(value).toFixed(1)}B`];
              if (name === "Rate") return [`${Number(value).toFixed(2)}B/day`];
              return [value];
            }}
            labelFormatter={(label) => formatDate(label)}
          />
          {visibleSeries.cumulative && (
            <>
              <Area
                yAxisId="cumulative"
                type="monotone"
                dataKey="cumulative"
                fill="url(#burnGradient)"
                stroke="none"
              />
              <Line
                yAxisId="cumulative"
                type="monotone"
                dataKey="cumulative"
                name="Cumulative"
                stroke={CHART_COLORS.primary}
                strokeWidth={2}
                dot={false}
              />
            </>
          )}
          {visibleSeries.rate && (
            <Line
              yAxisId="rate"
              type="monotone"
              dataKey="rate"
              name="Rate"
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
