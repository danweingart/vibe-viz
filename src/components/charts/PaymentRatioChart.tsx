"use client";

import { useMemo, useState } from "react";
import { getChartFilename } from "@/lib/chartExport/index";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { StandardChartCard, LegendItem } from "@/components/charts/StandardChartCard";
import { ChartStatCard, ChartStatGrid, ToggleButtonGroup } from "@/components/ui";
import { usePriceHistory, useBasketPriceHistory } from "@/hooks";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatDate } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import { CHART_MARGINS, AXIS_STYLE, GRID_STYLE, getTooltipContentStyle, getAlignedTicks } from "@/lib/chartConfig";
import { FONT_SIZE } from "@/lib/tokens";
import { CustomLabel, shouldShowLabel } from "@/lib/chartHelpers";

// Calculate 7-day rolling average for an array of values
function calculate7DayMA<T>(data: T[], getValue: (item: T) => number): number[] {
  return data.map((_, i) => {
    const slice = data.slice(Math.max(0, i - 6), i + 1);
    const values = slice.map(getValue);
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  });
}

interface DailyPaymentData {
  date: string;
  ethPct: number;
  wethPct: number;
}

interface PaymentLineChartProps {
  data: DailyPaymentData[];
  label: string;
  showXAxis?: boolean;
  avgEth: number;
  avgWeth: number;
}

function PaymentLineChart({ data, label, showXAxis = true, avgEth, avgWeth }: PaymentLineChartProps) {
  const timeRange = 30; // Default for this chart type
  const tickDates = getAlignedTicks(data.map(d => d.date), 6);
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-foreground-muted font-medium">{label}</p>
        <div className="flex gap-3" style={{ fontSize: FONT_SIZE.xs }}>
          <span style={{ color: CHART_COLORS.primary }}>ETH: {avgEth.toFixed(0)}%</span>
          <span style={{ color: CHART_COLORS.danger }}>WETH: {avgWeth.toFixed(0)}%</span>
        </div>
      </div>
      <div className="flex-1 min-h-[320px] sm:min-h-[500px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ ...CHART_MARGINS.default, bottom: showXAxis ? 20 : 5 }}>
            <CartesianGrid strokeDasharray={GRID_STYLE.strokeDasharray} stroke={GRID_STYLE.stroke} vertical={GRID_STYLE.vertical} />
            <XAxis
              dataKey="date"
              stroke={AXIS_STYLE.stroke}
              fontSize={AXIS_STYLE.fontSize}
              fontFamily={AXIS_STYLE.fontFamily}
              ticks={getAlignedTicks(data.map(d => d.date), 6)}
              tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              hide={!showXAxis}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={AXIS_STYLE.tickLine}
            />
            <YAxis
              stroke={AXIS_STYLE.stroke}
              fontSize={AXIS_STYLE.fontSize}
              fontFamily={AXIS_STYLE.fontFamily}
              tickFormatter={(v) => `${v}%`}
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              width={40}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={AXIS_STYLE.tickLine}
            />
            <Tooltip
              contentStyle={getTooltipContentStyle()}
              labelStyle={{ color: "#ffffff" }}
              formatter={(value, name) => {
                const labelText = name === "ethPct" ? "ETH" : "WETH";
                return [`${Number(value).toFixed(1)}%`, labelText];
              }}
              labelFormatter={(l) => formatDate(l)}
            />
            <Line
              type="monotone"
              dataKey="ethPct"
              stroke={CHART_COLORS.primary}
              strokeWidth={2}
              dot={(props: any) => {
                const { index } = props;
                if (!shouldShowLabel(index, data.length, timeRange)) return null;
                return <circle {...props} r={3} fill={CHART_COLORS.primary} strokeWidth={0} />;
              }}
              activeDot={{ r: 5, fill: CHART_COLORS.primary, stroke: "#0a0a0a", strokeWidth: 2 }}
              label={(props: any) => (
                <CustomLabel
                  {...props}
                  date={data[props.index]?.date}
                  tickDates={tickDates}
                  color={CHART_COLORS.primary}
                  formatter={(value: number) => `${value.toFixed(0)}%`}
                />
              )}
            />
            <Line
              type="monotone"
              dataKey="wethPct"
              stroke={CHART_COLORS.danger}
              strokeWidth={2}
              dot={(props: any) => {
                const { index } = props;
                if (!shouldShowLabel(index, data.length, timeRange)) return null;
                return <circle {...props} r={3} fill={CHART_COLORS.danger} strokeWidth={0} />;
              }}
              activeDot={{ r: 5, fill: CHART_COLORS.danger, stroke: "#0a0a0a", strokeWidth: 2 }}
              label={(props: any) => (
                <CustomLabel
                  {...props}
                  date={data[props.index]?.date}
                  tickDates={tickDates}
                  color={CHART_COLORS.danger}
                  formatter={(value: number) => `${value.toFixed(0)}%`}
                />
              )}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function PaymentRatioChart() {
  const [showComparison, setShowComparison] = useState(false);
  const { timeRange } = useChartSettings();
  const { data: priceHistory, isLoading, error } = usePriceHistory(timeRange);
  const { data: basketData, isLoading: basketLoading } = useBasketPriceHistory(timeRange);

  // Transform daily payment data into percentages with 7-day rolling average
  const { gvcDailyData, basketDailyData, gvcAvgEth, gvcAvgWeth, basketAvgEth, basketAvgWeth } = useMemo(() => {
    if (!priceHistory) {
      return {
        gvcDailyData: [],
        basketDailyData: [],
        gvcAvgEth: 0,
        gvcAvgWeth: 0,
        basketAvgEth: 0,
        basketAvgWeth: 0,
      };
    }

    // Calculate daily GVC percentages using volume-weighting (ETH + WETH only, excludes Other)
    const gvcDailyRaw = priceHistory.map((day) => {
      // Use volume fields if available, fallback to count * avgPrice for backward compatibility
      const ethVol = day.ethVolume ?? day.ethPayments * day.avgPrice;
      const wethVol = day.wethVolume ?? day.wethPayments * day.avgPrice;
      const totalVol = ethVol + wethVol;
      return {
        date: day.date,
        ethPct: totalVol > 0 ? (ethVol / totalVol) * 100 : 0,
        wethPct: totalVol > 0 ? (wethVol / totalVol) * 100 : 0,
      };
    });

    // Apply 7-day rolling average to GVC data
    const gvcEthMA = calculate7DayMA(gvcDailyRaw, (d) => d.ethPct);
    const gvcWethMA = calculate7DayMA(gvcDailyRaw, (d) => d.wethPct);

    const gvcDaily: DailyPaymentData[] = gvcDailyRaw.map((d, i) => ({
      date: d.date,
      ethPct: gvcEthMA[i],
      wethPct: gvcWethMA[i],
    }));

    // Calculate GVC averages from smoothed data
    const gvcEthAvg = gvcDaily.length > 0
      ? gvcDaily.reduce((sum, d) => sum + d.ethPct, 0) / gvcDaily.length
      : 0;
    const gvcWethAvg = gvcDaily.length > 0
      ? gvcDaily.reduce((sum, d) => sum + d.wethPct, 0) / gvcDaily.length
      : 0;

    // Get basket daily data and apply 7-day rolling average
    const basketDailyRaw = basketData?.dailyData || [];
    const basketEthMA = calculate7DayMA(basketDailyRaw, (d) => d.ethPct);
    const basketWethMA = calculate7DayMA(basketDailyRaw, (d) => d.wethPct);

    const basketDaily: DailyPaymentData[] = basketDailyRaw.map((d, i) => ({
      date: d.date,
      ethPct: basketEthMA[i],
      wethPct: basketWethMA[i],
    }));

    // Calculate basket averages from smoothed data
    const basketEthAvg = basketDaily.length > 0
      ? basketDaily.reduce((sum, d) => sum + d.ethPct, 0) / basketDaily.length
      : basketData?.aggregated.ethPaymentPct || 0;
    const basketWethAvg = basketDaily.length > 0
      ? basketDaily.reduce((sum, d) => sum + d.wethPct, 0) / basketDaily.length
      : basketData?.aggregated.wethPaymentPct || 0;

    return {
      gvcDailyData: gvcDaily,
      basketDailyData: basketDaily,
      gvcAvgEth: gvcEthAvg,
      gvcAvgWeth: gvcWethAvg,
      basketAvgEth: basketEthAvg,
      basketAvgWeth: basketWethAvg,
    };
  }, [priceHistory, basketData]);

  const legendItems: LegendItem[] = [
    { key: "eth", label: "ETH", color: CHART_COLORS.primary },
    { key: "weth", label: "WETH", color: CHART_COLORS.danger },
  ];

  const exportConfig = useMemo(() => ({
    title: "ETH vs WETH Payments",
    filename: getChartFilename("payment-ratio", timeRange),
  }), [timeRange]);

  // Comparison toggle controls
  const comparisonControls = (
    <ToggleButtonGroup
      options={[
        { value: "gvc", label: "GVC" },
        { value: "compare", label: basketLoading && showComparison ? "Compare..." : "Compare" },
      ]}
      value={showComparison ? "compare" : "gvc"}
      onChange={(v) => setShowComparison(v === "compare")}
    />
  );

  // Stats - only shown when not in comparison mode
  const showStats = !(showComparison && !basketLoading && basketDailyData.length > 0);
  const statsContent = showStats ? (
    <ChartStatGrid columns={2}>
      <ChartStatCard
        label="ETH Usage"
        value={<span style={{ color: CHART_COLORS.primary }}>{gvcAvgEth.toFixed(0)}%</span>}
      />
      <ChartStatCard
        label="WETH Usage"
        value={<span style={{ color: CHART_COLORS.danger }}>{gvcAvgWeth.toFixed(0)}%</span>}
      />
    </ChartStatGrid>
  ) : undefined;

  // Chart content
  const chartContent = showComparison && !basketLoading && basketDailyData.length > 0 ? (
    <div className="flex gap-4 h-full">
      <PaymentLineChart
        data={gvcDailyData}
        label="Good Vibes Club"
        avgEth={gvcAvgEth}
        avgWeth={gvcAvgWeth}
      />
      <PaymentLineChart
        data={basketDailyData}
        label="Leading ETH Collections"
        avgEth={basketAvgEth}
        avgWeth={basketAvgWeth}
      />
    </div>
  ) : (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={gvcDailyData} margin={{ ...CHART_MARGINS.default, bottom: 20 }}>
        <CartesianGrid strokeDasharray={GRID_STYLE.strokeDasharray} stroke={GRID_STYLE.stroke} vertical={GRID_STYLE.vertical} />
        <XAxis
          dataKey="date"
          stroke={AXIS_STYLE.stroke}
          fontSize={AXIS_STYLE.fontSize}
          fontFamily={AXIS_STYLE.fontFamily}
          ticks={getAlignedTicks(gvcDailyData.map(d => d.date), 6)}
          tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          axisLine={AXIS_STYLE.axisLine}
          tickLine={AXIS_STYLE.tickLine}
        />
        <YAxis
          stroke={AXIS_STYLE.stroke}
          fontSize={AXIS_STYLE.fontSize}
          fontFamily={AXIS_STYLE.fontFamily}
          tickFormatter={(v) => `${v}%`}
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          width={40}
          axisLine={AXIS_STYLE.axisLine}
          tickLine={AXIS_STYLE.tickLine}
        />
        <Tooltip
          contentStyle={getTooltipContentStyle()}
          labelStyle={{ color: "#ffffff" }}
          formatter={(value, name) => {
            const labelText = name === "ethPct" ? "ETH" : "WETH";
            return [`${Number(value).toFixed(1)}%`, labelText];
          }}
          labelFormatter={(l) => formatDate(l)}
        />
        <Line
          type="monotone"
          dataKey="ethPct"
          stroke={CHART_COLORS.primary}
          strokeWidth={2}
          dot={{ r: 3, fill: CHART_COLORS.primary, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: CHART_COLORS.primary, stroke: "#0a0a0a", strokeWidth: 2 }}
        />
        <Line
          type="monotone"
          dataKey="wethPct"
          stroke={CHART_COLORS.danger}
          strokeWidth={2}
          dot={{ r: 3, fill: CHART_COLORS.danger, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: CHART_COLORS.danger, stroke: "#0a0a0a", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );

  return (
    <StandardChartCard
      title="ETH vs WETH Payments"
      href="/charts/payment-ratio"
      description="ETH vs WETH usage by volume (7D smoothed)"
      legend={legendItems}
      headerControls={comparisonControls}
      exportConfig={exportConfig}
      isLoading={isLoading}
      error={error}
      isEmpty={!priceHistory || gvcDailyData.length === 0}
      emptyMessage="No payment data available"
      stats={statsContent}
    >
      {chartContent}
    </StandardChartCard>
  );
}
