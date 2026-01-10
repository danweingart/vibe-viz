"use client";

import { useRef, useMemo, useState } from "react";
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
import Link from "next/link";
import { Card, CardHeader, CardDescription } from "@/components/ui";
import { ChartExportButtons } from "./ChartExportButtons";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { usePriceHistory } from "@/hooks/usePriceHistory";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatDate, formatNumber, formatEth, formatUsd } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";

// Generate evenly spaced tick values for X-axis alignment across charts
function getAlignedTicks(dates: string[], count: number): string[] {
  if (dates.length <= count) return dates;
  const step = (dates.length - 1) / (count - 1);
  return Array.from({ length: count }, (_, i) => dates[Math.round(i * step)]);
}

type ViewMode = "sales" | "volume";

export function SalesVolumeChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("sales");
  const { timeRange, currency } = useChartSettings();
  const { data, isLoading, error } = usePriceHistory(timeRange);

  const exportConfig = useMemo(() => ({
    title: viewMode === "sales" ? "Daily Sales Count" : "Daily Trading Volume",
    subtitle: viewMode === "sales"
      ? `Number of NFT sales per day over ${timeRange} days`
      : `Total sales volume per day (${currency.toUpperCase()})`,
    legend: [
      { color: CHART_COLORS.primary, label: viewMode === "sales" ? "Daily Sales" : "Daily Volume", value: viewMode === "sales" ? "Count" : currency.toUpperCase() },
      { color: CHART_COLORS.danger, label: "7D Average", value: "Trend" },
    ],
    filename: getChartFilename(viewMode === "sales" ? "sales-count" : "volume", timeRange),
  }), [timeRange, viewMode, currency]);

  if (isLoading) return <ChartSkeleton />;
  if (error || !data || data.length === 0) {
    return (
      <Card>
        <CardHeader><span className="text-lg font-bold font-brice">Daily Activity</span></CardHeader>
        <p className="text-foreground-muted text-center py-8">No data available</p>
      </Card>
    );
  }

  // Calculate 7-day rolling averages for both metrics
  const chartData = data.map((d, i) => {
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

  const totalSales = data.reduce((sum, d) => sum + d.salesCount, 0);
  const totalVolume = chartData.reduce((sum, d) => sum + d.displayVolume, 0);
  const avgDaily = viewMode === "sales"
    ? totalSales / data.length
    : totalVolume / data.length;

  const title = viewMode === "sales" ? "Daily Sales Count" : "Daily Trading Volume";
  const description = viewMode === "sales"
    ? "Number of NFT sales per day with 7D rolling average"
    : `Total sales volume per day (${currency.toUpperCase()})`;
  const linkHref = viewMode === "sales" ? "/charts/sales-velocity" : "/charts/volume";

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <Link href={linkHref} className="text-lg font-bold text-foreground font-brice hover:text-brand transition-colors">
            {title}
          </Link>
          <p className="export-branding text-sm text-brand font-mundial">Good Vibes Club</p>
          <CardDescription>{description}</CardDescription>
        </div>
        <ChartExportButtons chartRef={chartRef} config={exportConfig} />
      </CardHeader>

      {/* View Mode Toggle - Outside chartRef so it's excluded from download */}
      <div className="flex items-center justify-between px-4 mb-2">
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setViewMode("sales")}
            className={`px-2.5 py-1 text-[10px] font-medium transition-colors ${
              viewMode === "sales"
                ? "bg-brand text-background"
                : "text-foreground-muted hover:text-foreground hover:bg-border"
            }`}
          >
            Sales
          </button>
          <button
            onClick={() => setViewMode("volume")}
            className={`px-2.5 py-1 text-[10px] font-medium transition-colors ${
              viewMode === "volume"
                ? "bg-brand text-background"
                : "text-foreground-muted hover:text-foreground hover:bg-border"
            }`}
          >
            Volume
          </button>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-foreground">
            {viewMode === "sales"
              ? formatNumber(totalSales)
              : currency === "eth" ? formatEth(totalVolume, 1) : formatUsd(totalVolume)
            }
          </p>
          <p className="text-[10px] text-foreground-muted">{timeRange}D Total</p>
        </div>
      </div>

      {/* Chart content - This gets captured in download */}
      <div ref={chartRef} className="px-1 pt-1 bg-background-secondary rounded-lg chart-container flex-1 flex flex-col">
        <div className="flex-1 min-h-[220px] sm:min-h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 8, left: -5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#71717a"
                fontSize={11}
                fontFamily="var(--font-mundial)"
                tickLine={false}
                axisLine={false}
                ticks={getAlignedTicks(chartData.map(d => d.date), 6)}
                tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              />
              <YAxis
                stroke="#71717a"
                fontSize={11}
                fontFamily="var(--font-mundial)"
                axisLine={false}
                tickLine={false}
                width={35}
                tickFormatter={(v) =>
                  viewMode === "sales"
                    ? String(v)
                    : currency === "eth" ? `${v.toFixed(1)}` : `$${(v/1000).toFixed(0)}k`
                }
              />
              <Tooltip
                contentStyle={{ backgroundColor: "#141414", border: "1px solid #27272a", borderRadius: "8px" }}
                labelStyle={{ color: "#fafafa" }}
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
                  <Bar dataKey="salesCount" name="Daily Sales" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} opacity={0.8} />
                  <Line type="monotone" dataKey="salesMa7" name="7D Average" stroke={CHART_COLORS.danger} strokeWidth={2} dot={false} />
                </>
              ) : (
                <>
                  <Bar dataKey="displayVolume" name="Volume" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} opacity={0.8} />
                  <Line type="monotone" dataKey="displayVolumeMa7" name="7D Average" stroke={CHART_COLORS.danger} strokeWidth={2} dot={false} />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="flex justify-between items-center mt-2 text-xs">
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-brand" />
              <span className="text-foreground-muted">Daily {viewMode === "sales" ? "Sales" : "Volume"}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-chart-danger" />
              <span className="text-foreground-muted">7D Average</span>
            </div>
          </div>
          <span className="text-foreground-muted">
            Avg: {viewMode === "sales"
              ? `${avgDaily.toFixed(1)}/day`
              : currency === "eth" ? formatEth(avgDaily, 2) : formatUsd(avgDaily)
            }
          </span>
        </div>

      </div>
    </Card>
  );
}
