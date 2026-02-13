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
import { StandardChartCard, LegendItem } from "@/components/charts/StandardChartCard";
import { usePriceHistory } from "@/hooks/usePriceHistory";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatEth, formatUsd, formatDate } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import { CHART_MARGINS, AXIS_STYLE, GRID_STYLE, getTooltipContentStyle, getAlignedTicks } from "@/lib/chartConfig";
import { getChartFilename } from "@/lib/chartExport";
import { CustomLabel } from "@/lib/chartHelpers";

export function VolumeChart() {
  const { timeRange, currency } = useChartSettings();
  const { data, isLoading, error } = usePriceHistory(timeRange);

  // Track which series are visible
  const [visibleSeries, setVisibleSeries] = useState({
    volume: true,
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
      ...d,
      displayVolume: currency === "eth" ? d.volume : d.volumeUsd,
    }));
  }, [data, currency]);

  // Calculate tick dates for label alignment
  const tickDates = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];
    // For 7D view, show all days. For longer periods, show 6 evenly spaced ticks
    const count = timeRange === 7 ? chartData.length : 6;
    return getAlignedTicks(chartData.map(d => d.date), count);
  }, [chartData, timeRange]);

  // Calculate stats
  const totalVolume = chartData.reduce((sum, d) => sum + d.displayVolume, 0);
  const dailyAvg = data && data.length > 0 ? totalVolume / data.length : 0;

  const lastWeek = chartData.slice(-7);
  const prevWeek = chartData.slice(-14, -7);
  const lastWeekTotal = lastWeek.reduce((sum, d) => sum + d.displayVolume, 0);
  const prevWeekTotal = prevWeek.reduce((sum, d) => sum + d.displayVolume, 0);
  const weekChange = prevWeekTotal > 0 ? ((lastWeekTotal - prevWeekTotal) / prevWeekTotal) * 100 : 0;

  // Legend items with active state
  const legendItems: LegendItem[] = [
    { key: "volume", label: "Daily Volume", color: CHART_COLORS.primary, active: visibleSeries.volume },
  ];

  // Export configuration
  const exportConfig = useMemo(() => ({
    title: "Trading Volume",
    filename: getChartFilename("volume", timeRange),
  }), [timeRange]);

  return (
    <StandardChartCard
      title="Trading Volume"
      href="/charts/volume"
      description={`Total ${currency === "eth" ? "ETH" : "USD"} traded per day`}
      legend={legendItems}
      onLegendToggle={handleLegendToggle}
      exportConfig={exportConfig}
      isLoading={isLoading}
      error={error}
      isEmpty={!data || data.length === 0}
      emptyMessage="No volume data available"
      stats={
        <ChartStatGrid columns={2}>
          <ChartStatCard
            label={`${timeRange}D Total`}
            value={currency === "eth" ? formatEth(totalVolume, 1) : formatUsd(totalVolume)}
            subValue={currency === "eth" ? `${formatEth(dailyAvg, 2)}/day` : `${formatUsd(dailyAvg)}/day`}
          />
          <ChartStatCard
            label="Last 7 Days"
            value={currency === "eth" ? formatEth(lastWeekTotal, 1) : formatUsd(lastWeekTotal)}
            change={weekChange}
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
            dataKey="date"
            stroke={AXIS_STYLE.stroke}
            fontSize={AXIS_STYLE.fontSize}
            fontFamily={AXIS_STYLE.fontFamily}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            ticks={getAlignedTicks(chartData.map(d => d.date), 6)}
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
            tickFormatter={(v) =>
              currency === "eth" ? `${v.toFixed(1)}` : `$${(v / 1000).toFixed(0)}k`
            }
          />
          <Tooltip
            contentStyle={getTooltipContentStyle()}
            labelStyle={{ color: "#ffffff" }}
            formatter={(value) => [
              currency === "eth" ? formatEth(Number(value), 2) : formatUsd(Number(value)),
              "Volume",
            ]}
            labelFormatter={(label) => formatDate(label)}
          />
          {visibleSeries.volume && (
            <Bar
              dataKey="displayVolume"
              fill={CHART_COLORS.primary}
              radius={[4, 4, 0, 0]}
              label={(props: any) => (
                <CustomLabel {...props} tickDates={tickDates} color={CHART_COLORS.primary}
                  formatter={(value: number) =>
                    currency === "eth" ? `${value.toFixed(1)}Ξ` : `$${(value / 1000).toFixed(0)}k`
                  }
                />
              )}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </StandardChartCard>
  );
}
