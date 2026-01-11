"use client";

import { useRef, useMemo } from "react";
import { getChartFilename } from "@/lib/chartExport/index";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Link from "next/link";
import { Card, ChartLegendToggle, ChartStatCard, ChartStatGrid } from "@/components/ui";
import { ChartExportButtons } from "./ChartExportButtons";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { usePriceHistory } from "@/hooks";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatEth, formatUsd, formatDate } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import { CHART_MARGINS, AXIS_STYLE, GRID_STYLE, CHART_HEIGHT, getTooltipContentStyle } from "@/lib/chartConfig";

export function CumulativeVolumeChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const { timeRange, currency } = useChartSettings();
  const { data, isLoading, error } = usePriceHistory(timeRange);

  const exportConfig = useMemo(() => ({
    title: "Cumulative Volume",
    subtitle: `Running total over ${timeRange} days (${currency.toUpperCase()})`,
    legend: [
      { color: CHART_COLORS.primary, label: "Cumulative Volume", value: currency === "eth" ? "ETH" : "USD" },
    ],
    filename: getChartFilename("cumulative-volume", timeRange),
  }), [timeRange, currency]);

  const legendItems = [
    { key: "cumulative", label: "Cumulative", color: CHART_COLORS.primary },
  ];

  const { chartData, totalVolume, dailyAvg, growthRate } = useMemo(() => {
    if (!data || data.length === 0) {
      return { chartData: [], totalVolume: 0, dailyAvg: 0, growthRate: 0 };
    }

    // Calculate cumulative volume
    let cumulative = 0;
    let cumulativeUsd = 0;
    const processed = data.map((d) => {
      cumulative += d.volume;
      cumulativeUsd += d.volumeUsd;
      return {
        ...d,
        cumulative,
        cumulativeUsd,
        displayCumulative: currency === "eth" ? cumulative : cumulativeUsd,
        displayDaily: currency === "eth" ? d.volume : d.volumeUsd,
      };
    });

    const total = currency === "eth" ? cumulative : cumulativeUsd;
    const avg = total / data.length;

    // Calculate growth rate (comparing daily average in 2nd half vs 1st half)
    const midpoint = Math.floor(data.length / 2);
    const firstHalfDays = processed.slice(0, midpoint);
    const secondHalfDays = processed.slice(midpoint);
    const firstHalfAvg = firstHalfDays.length > 0
      ? firstHalfDays.reduce((sum, d) => sum + d.displayDaily, 0) / firstHalfDays.length
      : 0;
    const secondHalfAvg = secondHalfDays.length > 0
      ? secondHalfDays.reduce((sum, d) => sum + d.displayDaily, 0) / secondHalfDays.length
      : 0;
    const growth = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;

    return {
      chartData: processed,
      totalVolume: total,
      dailyAvg: avg,
      growthRate: growth,
    };
  }, [data, currency]);

  if (isLoading) return <ChartSkeleton />;
  if (error || !data || data.length === 0) {
    return (
      <Card>
        <div className="p-6">
          <span className="text-lg font-bold font-brice">Cumulative Volume</span>
          <p className="text-foreground-muted text-center py-8">No data available</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      {/* Header - OUTSIDE chartRef so it doesn't appear in exported PNG */}
      <div className="flex items-start justify-between p-3">
        <div>
          <Link href="/charts/cumulative-volume" className="text-lg font-bold text-foreground font-brice hover:text-brand transition-colors">
            Cumulative Volume
          </Link>
          <p className="text-sm text-foreground-muted">
            Running total over {timeRange} days ({currency.toUpperCase()})
          </p>
        </div>
        <ChartExportButtons chartRef={chartRef} config={exportConfig} />
      </div>

      <div className="flex items-center px-3 mb-3">
        <ChartLegendToggle items={legendItems} />
      </div>

      {/* Exportable chart content */}
      <div ref={chartRef} className="p-3 bg-background-secondary rounded-lg chart-container flex-1 flex flex-col">
        {/* Export-only branding */}
        <div className="export-branding mb-2">
          <p className="text-lg font-bold text-foreground font-brice">Cumulative Volume</p>
          <p className="text-sm text-brand font-mundial">Good Vibes Club</p>
          <p className="text-sm text-foreground-muted">
            Running total over {timeRange} days ({currency.toUpperCase()})
          </p>
        </div>

        {/* Chart */}
        <div className="flex-1 min-h-[320px] sm:min-h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={CHART_MARGINS.default}>
              <defs>
                <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.6} />
                  <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray={GRID_STYLE.strokeDasharray} stroke={GRID_STYLE.stroke} vertical={GRID_STYLE.vertical} />
              <XAxis
                dataKey="date"
                stroke={AXIS_STYLE.stroke}
                fontSize={AXIS_STYLE.fontSize}
                fontFamily={AXIS_STYLE.fontFamily}
                interval={Math.max(0, Math.floor(chartData.length / 6) - 1) || 0}
                tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                axisLine={AXIS_STYLE.axisLine}
                tickLine={AXIS_STYLE.tickLine}
              />
              <YAxis
                stroke={AXIS_STYLE.stroke}
                fontSize={AXIS_STYLE.fontSize}
                fontFamily={AXIS_STYLE.fontFamily}
                width={40}
                tickFormatter={(v) => currency === "eth" ? `${(v).toFixed(0)}` : `$${(v / 1000).toFixed(0)}k`}
                axisLine={AXIS_STYLE.axisLine}
                tickLine={AXIS_STYLE.tickLine}
              />
              <Tooltip
                contentStyle={getTooltipContentStyle()}
                labelStyle={{ color: "#fafafa" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length || !label) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div className="bg-background-secondary border border-border rounded-lg p-2 text-xs">
                      <p className="font-bold text-foreground">{formatDate(String(label))}</p>
                      <p className="text-brand">
                        Cumulative: {currency === "eth" ? formatEth(d.displayCumulative, 2) : formatUsd(d.displayCumulative)}
                      </p>
                      <p className="text-foreground-muted">
                        Daily: +{currency === "eth" ? formatEth(d.displayDaily, 2) : formatUsd(d.displayDaily)}
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="displayCumulative"
                stroke={CHART_COLORS.primary}
                strokeWidth={2}
                fill="url(#cumulativeGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <ChartStatGrid columns={3}>
          <ChartStatCard
            label="Total Volume"
            value={currency === "eth" ? formatEth(totalVolume, 1) : formatUsd(totalVolume)}
          />
          <ChartStatCard
            label="Daily Avg"
            value={currency === "eth" ? formatEth(dailyAvg, 2) : formatUsd(dailyAvg)}
          />
          <ChartStatCard
            label="Velocity Δ"
            value={`${growthRate > 0 ? "+" : ""}${growthRate.toFixed(0)}%`}
          />
        </ChartStatGrid>
      </div>
    </Card>
  );
}
