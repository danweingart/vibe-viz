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
  ReferenceLine,
} from "recharts";
import { ChartStatCard, ChartStatGrid } from "@/components/ui";
import { StandardChartCard, LegendItem } from "@/components/charts/StandardChartCard";
import { usePriceHistory } from "@/hooks/usePriceHistory";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatEth, formatUsd, formatDate } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import { CHART_MARGINS, AXIS_STYLE, GRID_STYLE, getTooltipContentStyle, getAlignedTicks } from "@/lib/chartConfig";
import { getChartFilename } from "@/lib/chartExport";
import { CustomLabel, shouldShowLabel } from "@/lib/chartHelpers";

export function FloorPriceChart() {
  const { timeRange, currency } = useChartSettings();
  const { data, isLoading, error } = usePriceHistory(timeRange);

  // Track which series are visible
  const [visibleSeries, setVisibleSeries] = useState({
    floor: true,
    ma7: true,
  });

  const handleLegendToggle = (key: string) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
  };

  // Calculate chart data with 7-day moving average
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.map((d, i) => {
      const slice = data.slice(Math.max(0, i - 6), i + 1);
      const ma7 = slice.reduce((sum, s) => sum + s.minPrice, 0) / slice.length;
      const displayFloor = currency === "eth" ? d.minPrice : d.minPrice * d.ethPrice;
      const displayMa7 = currency === "eth" ? ma7 : ma7 * d.ethPrice;
      return { ...d, ma7: displayMa7, displayFloor };
    });
  }, [data, currency]);

  // Calculate tick dates for label alignment
  const tickDates = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];
    // For 7D view, show all days. For longer periods, show 6 evenly spaced ticks
    const count = timeRange === 7 ? chartData.length : 6;
    return getAlignedTicks(chartData.map(d => d.date), count);
  }, [chartData, timeRange]);

  // Calculate stats
  const currentFloor = chartData[chartData.length - 1]?.displayFloor || 0;
  const avgFloor = chartData.length > 0
    ? chartData.reduce((sum, d) => sum + d.displayFloor, 0) / chartData.length
    : 0;

  // Legend items with active state
  const legendItems: LegendItem[] = [
    { key: "floor", label: "Floor Price", color: CHART_COLORS.primary, active: visibleSeries.floor },
    { key: "ma7", label: "7D MA", color: CHART_COLORS.info, active: visibleSeries.ma7 },
  ];

  // Export configuration
  const exportConfig = useMemo(() => ({
    filename: getChartFilename("floor-price", timeRange),
    title: "Floor Price",
  }), [timeRange]);

  return (
    <StandardChartCard
      title="Floor Price"
      href="/charts/floor-price"
      description="Daily minimum sale price with 7-day moving average"
      legend={legendItems}
      onLegendToggle={handleLegendToggle}
      exportConfig={exportConfig}
      isLoading={isLoading}
      error={error}
      isEmpty={!data || data.length === 0}
      emptyMessage="No floor price data available"
      stats={
        <ChartStatGrid columns={2}>
          <ChartStatCard
            label="Current Floor"
            value={currency === "eth" ? formatEth(currentFloor, 2) : formatUsd(currentFloor)}
          />
          <ChartStatCard
            label={`${timeRange}D Average`}
            value={currency === "eth" ? formatEth(avgFloor, 2) : formatUsd(avgFloor)}
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
            ticks={tickDates}
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
            width={40}
            tickFormatter={(v) => (currency === "eth" ? v.toFixed(2) : `$${v.toFixed(0)}`)}
          />
          <Tooltip
            contentStyle={getTooltipContentStyle()}
            labelStyle={{ color: "#ffffff" }}
            formatter={(value) => [
              currency === "eth" ? formatEth(Number(value), 2) : formatUsd(Number(value)),
            ]}
            labelFormatter={(label) => formatDate(label)}
          />
          <ReferenceLine y={avgFloor} stroke={CHART_COLORS.muted} strokeDasharray="5 5" />
          {visibleSeries.floor && (
            <Line
              type="monotone"
              dataKey="displayFloor"
              name="Floor"
              stroke={CHART_COLORS.primary}
              strokeWidth={2}
              dot={(props: any) => {
                const { payload } = props;
                if (!payload?.date || !tickDates.includes(payload.date)) return null;
                return <circle {...props} r={3} fill={CHART_COLORS.primary} strokeWidth={0} />;
              }}
              label={(props: any) => (
                <CustomLabel
                  {...props}
                  date={chartData[props.index]?.date}
                  tickDates={tickDates}
                  color={CHART_COLORS.primary}
                  formatter={(value: number) =>
                    currency === "eth" ? `${value.toFixed(2)}Ξ` : `$${value.toFixed(0)}`
                  }
                />
              )}
            />
          )}
          {visibleSeries.ma7 && (
            <Line
              type="monotone"
              dataKey="ma7"
              name="7D MA"
              stroke={CHART_COLORS.info}
              strokeWidth={2}
              dot={false}
              strokeDasharray="5 5"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </StandardChartCard>
  );
}
