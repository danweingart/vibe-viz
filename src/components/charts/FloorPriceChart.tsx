"use client";

import { useRef, useState, useCallback } from "react";
import { exportChartForX, getChartFilename } from "@/lib/chartExport";
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
import Link from "next/link";
import { Card, CardHeader, CardDescription, Button } from "@/components/ui";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { usePriceHistory } from "@/hooks/usePriceHistory";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatEth, formatUsd, formatDate } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";

export function FloorPriceChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const { timeRange, currency } = useChartSettings();
  const { data, isLoading, error } = usePriceHistory(timeRange);

  const handleDownload = useCallback(async () => {
    if (!chartRef.current) return;
    setIsExporting(true);
    try {
      await exportChartForX(chartRef.current, {
        filename: getChartFilename("floor-price", timeRange),
      });
    } catch (error) {
      console.error("Failed to export:", error);
    } finally {
      setIsExporting(false);
    }
  }, [timeRange]);

  if (isLoading) return <ChartSkeleton />;
  if (error || !data || data.length === 0) {
    return (
      <Card>
        <CardHeader><span className="text-lg font-bold font-brice">Daily Floor Price</span></CardHeader>
        <p className="text-foreground-muted text-center py-8">No data available</p>
      </Card>
    );
  }

  // Calculate 7-day moving average and convert currency
  const chartData = data.map((d, i) => {
    const slice = data.slice(Math.max(0, i - 6), i + 1);
    const ma7 = slice.reduce((sum, s) => sum + s.minPrice, 0) / slice.length;
    const displayFloor = currency === "eth" ? d.minPrice : d.minPrice * d.ethPrice;
    const displayMa7 = currency === "eth" ? ma7 : ma7 * d.ethPrice;
    return { ...d, ma7: displayMa7, displayFloor };
  });

  const currentFloor = chartData[chartData.length - 1]?.displayFloor || 0;
  const avgFloor = chartData.reduce((sum, d) => sum + d.displayFloor, 0) / chartData.length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <Link href="/charts/floor-price" className="text-lg font-bold text-foreground font-brice hover:text-brand transition-colors">
            Floor Price
          </Link>
          <p className="export-branding text-sm text-brand font-mundial">Good Vibes Club</p>
          <CardDescription>Lowest sale price each day + 7D trend line</CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-bold text-foreground">
              {currency === "eth" ? formatEth(currentFloor, 2) : formatUsd(currentFloor)}
            </p>
            <p className="text-[10px] text-foreground-muted">Current</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleDownload} isLoading={isExporting}>
            <DownloadIcon className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <div ref={chartRef} className="px-1 pt-1 bg-background-secondary rounded-lg chart-container flex-1 flex flex-col">
        <div className="flex-1 min-h-[120px] sm:min-h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 8, left: -5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="date"
                stroke="#71717a"
                fontSize={11}
                fontFamily="var(--font-mundial)"
                axisLine={false}
                tickLine={false}
                interval={Math.max(0, Math.floor(chartData.length / 6) - 1)}
                tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              />
              <YAxis
                stroke="#71717a"
                fontSize={11}
                fontFamily="var(--font-mundial)"
                axisLine={false}
                tickLine={false}
                width={40}
                tickFormatter={(v) => currency === "eth" ? v.toFixed(2) : `$${v.toFixed(0)}`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "#141414", border: "1px solid #27272a", borderRadius: "8px" }}
                labelStyle={{ color: "#fafafa" }}
                formatter={(value) => [currency === "eth" ? formatEth(Number(value), 2) : formatUsd(Number(value))]}
                labelFormatter={(label) => formatDate(label)}
              />
              <ReferenceLine y={avgFloor} stroke={CHART_COLORS.muted} strokeDasharray="5 5" />
              <Line type="monotone" dataKey="displayFloor" name="Floor" stroke={CHART_COLORS.primary} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="ma7" name="7D MA" stroke={CHART_COLORS.info} strokeWidth={2} dot={false} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex justify-center gap-6 mt-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-brand" />
            <span className="text-foreground-muted">Floor Price</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-chart-info" style={{ borderStyle: "dashed" }} />
            <span className="text-foreground-muted">7D Moving Avg</span>
          </div>
        </div>

      </div>
    </Card>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}
