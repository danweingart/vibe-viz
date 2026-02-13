"use client";

import { useMemo, useState } from "react";
import { getChartFilename } from "@/lib/chartExport/index";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartStatCard, ChartStatGrid, ToggleButtonGroup } from "@/components/ui";
import { StandardChartCard, LegendItem } from "@/components/charts/StandardChartCard";
import { usePriceHistory } from "@/hooks/usePriceHistory";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatDate, formatNumber, formatEth, formatUsd } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import { CHART_MARGINS, AXIS_STYLE, GRID_STYLE, getTooltipContentStyle, getAlignedTicks } from "@/lib/chartConfig";
import { CustomLabel, shouldShowLabel } from "@/lib/chartHelpers";

type ViewMode = "sales" | "volume";

export function SalesVolumeChart() {
  const [viewMode, setViewMode] = useState<ViewMode>("sales");
  const { timeRange, currency } = useChartSettings();
  const { data, isLoading, error } = usePriceHistory(timeRange);

  // Calculate 7-day rolling averages for both metrics
  const chartData = useMemo(() => {
    if (!data) return [];
    return data.map((d, i) => {
      const slice = data.slice(Math.max(0, i - 6), i + 1);
      const salesMa7 = slice.reduce((sum, s) => sum + s.salesCount, 0) / slice.length;
      const volumeMa7 = slice.reduce((sum, s) => sum + s.volume, 0) / slice.length;
      const volumeUsdMa7 = slice.reduce((sum, s) => sum + s.volumeUsd, 0) / slice.length;

      return {
        ...d,
        salesMa7: Math.round(salesMa7 * 10) / 10,
        volumeMa7,
        volumeUsdMa7,
        displayVolume: currency === "eth" ? d.volume : d.volumeUsd,
        displayVolumeMa7: currency === "eth" ? volumeMa7 : volumeUsdMa7,
      };
    });
  }, [data, currency]);

  // Calculate tick dates for label alignment
  const tickDates = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];
    // For 7D view, show all days. For longer periods, show 6 evenly spaced ticks
    const count = timeRange === 7 ? chartData.length : 6;
    return getAlignedTicks(chartData.map(d => d.date), count);
  }, [chartData, timeRange]);

  // Calculate stats values for export
  const exportStats = useMemo(() => {
    if (!data || data.length === 0 || chartData.length === 0) return { total: "0", lastWeek: "0", weekChange: 0 };
    const totalSales = data.reduce((sum, d) => sum + d.salesCount, 0);
    const totalVolume = chartData.reduce((sum, d) => sum + d.displayVolume, 0);
    const lastWeek = chartData.slice(-7);
    const prevWeek = chartData.slice(-14, -7);
    const lastWeekTotal = viewMode === "sales"
      ? lastWeek.reduce((sum, d) => sum + d.salesCount, 0)
      : lastWeek.reduce((sum, d) => sum + d.displayVolume, 0);
    const prevWeekTotal = viewMode === "sales"
      ? prevWeek.reduce((sum, d) => sum + d.salesCount, 0)
      : prevWeek.reduce((sum, d) => sum + d.displayVolume, 0);
    const weekChange = prevWeekTotal > 0 ? ((lastWeekTotal - prevWeekTotal) / prevWeekTotal) * 100 : 0;
    return {
      total: viewMode === "sales" ? formatNumber(totalSales) : (currency === "eth" ? formatEth(totalVolume, 1) : formatUsd(totalVolume)),
      lastWeek: viewMode === "sales" ? formatNumber(lastWeekTotal) : (currency === "eth" ? formatEth(lastWeekTotal, 1) : formatUsd(lastWeekTotal)),
      weekChange,
    };
  }, [data, chartData, viewMode, currency]);

  const exportConfig = useMemo(() => ({
    title: viewMode === "sales" ? "Daily Sales Count" : "Daily Trading Volume",
    filename: getChartFilename(viewMode === "sales" ? "sales-count" : "volume", timeRange),
  }), [timeRange, viewMode]);

  const stats = useMemo(() => {
    if (!data || data.length === 0 || chartData.length === 0) return null;

    const totalSales = data.reduce((sum, d) => sum + d.salesCount, 0);
    const totalVolume = chartData.reduce((sum, d) => sum + d.displayVolume, 0);
    const avgDaily = viewMode === "sales"
      ? totalSales / data.length
      : totalVolume / data.length;

    // Calculate week-over-week change
    const lastWeek = chartData.slice(-7);
    const prevWeek = chartData.slice(-14, -7);
    const lastWeekTotal = viewMode === "sales"
      ? lastWeek.reduce((sum, d) => sum + d.salesCount, 0)
      : lastWeek.reduce((sum, d) => sum + d.displayVolume, 0);
    const prevWeekTotal = viewMode === "sales"
      ? prevWeek.reduce((sum, d) => sum + d.salesCount, 0)
      : prevWeek.reduce((sum, d) => sum + d.displayVolume, 0);
    const weekChange = prevWeekTotal > 0 ? ((lastWeekTotal - prevWeekTotal) / prevWeekTotal) * 100 : 0;

    return (
      <ChartStatGrid columns={2}>
        <ChartStatCard
          label={`${timeRange}D Total`}
          value={viewMode === "sales"
            ? formatNumber(totalSales)
            : currency === "eth" ? formatEth(totalVolume, 1) : formatUsd(totalVolume)
          }
          subValue={viewMode === "sales"
            ? `${avgDaily.toFixed(1)}/day`
            : currency === "eth" ? `${formatEth(avgDaily, 2)}/day` : `${formatUsd(avgDaily)}/day`
          }
        />
        <ChartStatCard
          label="Last 7 Days"
          value={viewMode === "sales"
            ? formatNumber(lastWeekTotal)
            : currency === "eth" ? formatEth(lastWeekTotal, 1) : formatUsd(lastWeekTotal)
          }
          change={weekChange}
        />
      </ChartStatGrid>
    );
  }, [data, chartData, viewMode, timeRange, currency]);

  const title = viewMode === "sales" ? "Daily Sales Count" : "Daily Trading Volume";
  const description = viewMode === "sales"
    ? "Number of NFT sales per day with 7D rolling average"
    : `Total sales volume per day (${currency.toUpperCase()})`;
  const linkHref = viewMode === "sales" ? "/charts/sales-velocity" : "/charts/volume";

  const legendItems: LegendItem[] = [
    { key: "daily", label: viewMode === "sales" ? "Sales" : "Volume", color: CHART_COLORS.primary },
    { key: "average", label: "7D Avg", color: CHART_COLORS.danger },
  ];

  const viewToggle = (
    <ToggleButtonGroup
      options={[
        { value: "sales", label: "Sales" },
        { value: "volume", label: "Volume" },
      ]}
      value={viewMode}
      onChange={setViewMode}
    />
  );

  return (
    <StandardChartCard
      title={title}
      href={linkHref}
      description={description}
      legend={legendItems}
      headerControls={viewToggle}
      exportConfig={exportConfig}
      isLoading={isLoading}
      error={error}
      isEmpty={!data || data.length === 0}
      emptyMessage="No data available"
      stats={stats}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={CHART_MARGINS.default}>
          <CartesianGrid strokeDasharray={GRID_STYLE.strokeDasharray} stroke={GRID_STYLE.stroke} vertical={GRID_STYLE.vertical} />
          <XAxis
            dataKey="date"
            stroke={AXIS_STYLE.stroke}
            fontSize={AXIS_STYLE.fontSize}
            fontFamily={AXIS_STYLE.fontFamily}
            tickLine={AXIS_STYLE.tickLine}
            axisLine={AXIS_STYLE.axisLine}
            ticks={tickDates}
            tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          />
          <YAxis
            stroke={AXIS_STYLE.stroke}
            fontSize={AXIS_STYLE.fontSize}
            fontFamily={AXIS_STYLE.fontFamily}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            width={40}
            tickFormatter={(v) =>
              viewMode === "sales"
                ? String(v)
                : currency === "eth" ? `${v.toFixed(1)}` : `$${(v/1000).toFixed(0)}k`
            }
          />
          <Tooltip
            contentStyle={getTooltipContentStyle()}
            labelStyle={{ color: "#ffffff" }}
            formatter={(value, name) => {
              if (viewMode === "sales") {
                return [formatNumber(Number(value)), name === "salesCount" ? "Sales" : "7D Avg"];
              }
              return [
                currency === "eth" ? formatEth(Number(value), 2) : formatUsd(Number(value)),
                name === "displayVolume" ? "Volume" : "7D Avg"
              ];
            }}
            labelFormatter={(label) => formatDate(label)}
          />
          {viewMode === "sales" ? (
            <>
              <Bar
                dataKey="salesCount"
                name="Daily Sales"
                fill={CHART_COLORS.primary}
                radius={[4, 4, 0, 0]}
                opacity={0.8}
                label={(props: any) => (
                  <CustomLabel
                    {...props}
                    tickDates={tickDates}
                    color={CHART_COLORS.primary}
                    formatter={(value: number) => value.toFixed(0)}
                  />
                )}
              />
              <Line type="monotone" dataKey="salesMa7" name="7D Average" stroke={CHART_COLORS.danger} strokeWidth={2} dot={false} />
            </>
          ) : (
            <>
              <Bar
                dataKey="displayVolume"
                name="Volume"
                fill={CHART_COLORS.primary}
                radius={[4, 4, 0, 0]}
                opacity={0.8}
                label={(props: any) => (
                  <CustomLabel
                    {...props}
                    tickDates={tickDates}
                    color={CHART_COLORS.primary}
                    formatter={(value: number) =>
                      currency === "eth" ? `${value.toFixed(1)}Ξ` : `$${(value / 1000).toFixed(0)}k`
                    }
                  />
                )}
              />
              <Line type="monotone" dataKey="displayVolumeMa7" name="7D Average" stroke={CHART_COLORS.danger} strokeWidth={2} dot={false} />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </StandardChartCard>
  );
}
