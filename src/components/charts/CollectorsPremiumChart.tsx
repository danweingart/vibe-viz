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
import { ToggleButtonGroup, ChartStatCard, ChartStatGrid } from "@/components/ui";
import { usePriceHistory } from "@/hooks/usePriceHistory";
import { useBasketPriceHistory } from "@/hooks/useBasketPriceHistory";
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

interface PremiumChartRowProps {
  data: Array<{ date: string; value: number; basketValue?: number }>;
  label: string;
  color: string;
  avg: number;
  basketAvg?: number;
  showXAxis?: boolean;
  showComparison?: boolean;
  timeRange: number;
}

function PremiumChartRow({
  data,
  label,
  color,
  avg,
  basketAvg,
  showXAxis = false,
  showComparison = false,
  timeRange,
}: PremiumChartRowProps) {
  // For 7D view, show all days. For longer periods, show 6 evenly spaced ticks
  const count = timeRange === 7 ? data.length : 6;
  const tickDates = getAlignedTicks(data.map(d => d.date), count);
  return (
    <div className="flex items-center gap-2 h-full">
      {/* Y-axis label */}
      <div className="w-12 shrink-0 text-right">
        <p className="text-foreground-muted leading-none" style={{ fontSize: FONT_SIZE.xs }}>{label}</p>
      </div>

      {/* Chart - fills remaining space */}
      <div className="flex-1 h-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={CHART_MARGINS.default}>
            <CartesianGrid strokeDasharray={GRID_STYLE.strokeDasharray} stroke={GRID_STYLE.stroke} vertical={GRID_STYLE.vertical} />
            <XAxis
              dataKey="date"
              stroke={AXIS_STYLE.stroke}
              fontSize={AXIS_STYLE.fontSize}
              fontFamily={AXIS_STYLE.fontFamily}
              ticks={tickDates}
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
              domain={['auto', 'auto']}
              width={32}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={AXIS_STYLE.tickLine}
            />
            <Tooltip
              contentStyle={getTooltipContentStyle()}
              labelStyle={{ color: "#ffffff" }}
              formatter={(value, name) => {
                const labelText = name === "basketValue" ? "Leading ETH" : "GVC";
                return [`${Number(value).toFixed(1)}%`, labelText];
              }}
              labelFormatter={(l) => formatDate(l)}
            />
            {showComparison && (
              <Line
                type="monotone"
                dataKey="basketValue"
                stroke={CHART_COLORS.muted}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                activeDot={{ r: 4, fill: CHART_COLORS.muted, stroke: "#0a0a0a", strokeWidth: 2 }}
              />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={(props: any) => {
                const { payload } = props;
                if (!payload?.date || !tickDates.includes(payload.date)) return null;
                return <circle {...props} r={3} fill={color} strokeWidth={0} />;
              }}
              activeDot={{ r: 5, fill: color, stroke: "#0a0a0a", strokeWidth: 2 }}
              label={(props: any) => (
                <CustomLabel
                  {...props}
                  date={data[props.index]?.date}
                  tickDates={tickDates}
                  color={color}
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

export function CollectorsPremiumChart() {
  const [showComparison, setShowComparison] = useState(false);
  const { timeRange } = useChartSettings();
  const { data, isLoading, error } = usePriceHistory(timeRange);
  const { data: basketData, isLoading: basketLoading } = useBasketPriceHistory(timeRange);

  const exportConfig = useMemo(() => ({
    title: "Collector's Premium",
    filename: getChartFilename("collectors-premium", timeRange),
  }), [timeRange]);

  // Merge GVC data with basket data and apply 7-day rolling average
  const { data10, data25, data50, avg10, avg25, avg50, basketAvg10, basketAvg25, basketAvg50 } = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        data10: [], data25: [], data50: [],
        avg10: 0, avg25: 0, avg50: 0,
        basketAvg10: 0, basketAvg25: 0, basketAvg50: 0,
      };
    }

    // Calculate 7-day rolling averages for GVC
    const gvc10MA = calculate7DayMA(data, (d) => d.salesAbove10Pct);
    const gvc25MA = calculate7DayMA(data, (d) => d.salesAbove25Pct);
    const gvc50MA = calculate7DayMA(data, (d) => d.salesAbove50Pct);

    // Create basket data lookup by date and calculate 7-day MA
    const basketDailyArr = basketData?.dailyData || [];
    const basket10MA = calculate7DayMA(basketDailyArr, (d) => d.salesAbove10Pct);
    const basket25MA = calculate7DayMA(basketDailyArr, (d) => d.salesAbove25Pct);
    const basket50MA = calculate7DayMA(basketDailyArr, (d) => d.salesAbove50Pct);

    const basketByDate = new Map<string, { above10: number; above25: number; above50: number }>();
    basketDailyArr.forEach((d, i) => {
      basketByDate.set(d.date, {
        above10: basket10MA[i],
        above25: basket25MA[i],
        above50: basket50MA[i],
      });
    });

    // Transform data with 7-day MA values
    const d10 = data.map((d, i) => ({
      date: d.date,
      value: gvc10MA[i],
      basketValue: basketByDate.get(d.date)?.above10,
    }));
    const d25 = data.map((d, i) => ({
      date: d.date,
      value: gvc25MA[i],
      basketValue: basketByDate.get(d.date)?.above25,
    }));
    const d50 = data.map((d, i) => ({
      date: d.date,
      value: gvc50MA[i],
      basketValue: basketByDate.get(d.date)?.above50,
    }));

    // Calculate overall averages from the 7-day MA data
    const a10 = gvc10MA.length > 0 ? gvc10MA.reduce((sum, v) => sum + v, 0) / gvc10MA.length : 0;
    const a25 = gvc25MA.length > 0 ? gvc25MA.reduce((sum, v) => sum + v, 0) / gvc25MA.length : 0;
    const a50 = gvc50MA.length > 0 ? gvc50MA.reduce((sum, v) => sum + v, 0) / gvc50MA.length : 0;

    const bAvg10 = basket10MA.length > 0 ? basket10MA.reduce((sum, v) => sum + v, 0) / basket10MA.length : 0;
    const bAvg25 = basket25MA.length > 0 ? basket25MA.reduce((sum, v) => sum + v, 0) / basket25MA.length : 0;
    const bAvg50 = basket50MA.length > 0 ? basket50MA.reduce((sum, v) => sum + v, 0) / basket50MA.length : 0;

    return {
      data10: d10, data25: d25, data50: d50,
      avg10: a10, avg25: a25, avg50: a50,
      basketAvg10: bAvg10,
      basketAvg25: bAvg25,
      basketAvg50: bAvg50,
    };
  }, [data, basketData]);

  const comparisonToggle = (
    <ToggleButtonGroup
      options={[
        { value: "gvc", label: "GVC" },
        { value: "compare", label: basketLoading && showComparison ? "Compare..." : "Compare" },
      ]}
      value={showComparison ? "compare" : "gvc"}
      onChange={(v) => setShowComparison(v === "compare")}
    />
  );

  // Legend items for comparison mode (matches PaymentRatioChart style)
  const legendItems: LegendItem[] | undefined = showComparison && !basketLoading
    ? [
        { key: "gvc", label: "GVC", color: CHART_COLORS.primary, lineStyle: "solid" },
        { key: "basket", label: "Leading ETH Collections", color: CHART_COLORS.muted, lineStyle: "dashed" },
      ]
    : undefined;

  // Stats always visible - color coded to match chart lines, with comparison when active
  const showBasketComparison = showComparison && !basketLoading;
  const statsContent = (
    <ChartStatGrid columns={3}>
      <ChartStatCard
        label=">10% Floor"
        value={<span style={{ color: CHART_COLORS.success }}>{avg10.toFixed(0)}%</span>}
        subValue={showBasketComparison ? `${basketAvg10.toFixed(0)}%` : undefined}
      />
      <ChartStatCard
        label=">25% Floor"
        value={<span style={{ color: CHART_COLORS.primary }}>{avg25.toFixed(0)}%</span>}
        subValue={showBasketComparison ? `${basketAvg25.toFixed(0)}%` : undefined}
      />
      <ChartStatCard
        label=">50% Floor"
        value={<span style={{ color: CHART_COLORS.accent }}>{avg50.toFixed(0)}%</span>}
        subValue={showBasketComparison ? `${basketAvg50.toFixed(0)}%` : undefined}
      />
    </ChartStatGrid>
  );

  return (
    <StandardChartCard
      title="Collector's Premium"
      href="/charts/collectors-premium"
      description="% of daily sales priced above floor (7D smoothed)"
      legend={legendItems}
      headerControls={comparisonToggle}
      exportConfig={exportConfig}
      isLoading={isLoading}
      error={error}
      isEmpty={!data || data.length === 0}
      emptyMessage="No data available"
      stats={statsContent}
    >
      {/* Three stacked charts using grid with equal rows */}
      <div className="h-full grid grid-rows-3 gap-2">
          <PremiumChartRow
            data={data10}
            label=">10%"
            color={CHART_COLORS.success}
            avg={avg10}
            basketAvg={basketAvg10}
            showComparison={showComparison && !basketLoading}
            timeRange={timeRange}
          />
          <PremiumChartRow
            data={data25}
            label=">25%"
            color={CHART_COLORS.primary}
            avg={avg25}
            basketAvg={basketAvg25}
            showComparison={showComparison && !basketLoading}
            timeRange={timeRange}
          />
          <PremiumChartRow
            data={data50}
            label=">50%"
            color={CHART_COLORS.accent}
            avg={avg50}
            basketAvg={basketAvg50}
            showComparison={showComparison && !basketLoading}
            showXAxis={true}
            timeRange={timeRange}
          />
      </div>
    </StandardChartCard>
  );
}
