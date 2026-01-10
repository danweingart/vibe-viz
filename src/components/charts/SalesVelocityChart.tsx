"use client";

import { useRef, useState, useCallback } from "react";
import { exportChartForX, getChartFilename } from "@/lib/chartExport";
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
import { Card, CardHeader, CardDescription, Button } from "@/components/ui";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { usePriceHistory } from "@/hooks/usePriceHistory";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatDate, formatNumber } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";

export function SalesVelocityChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const { timeRange } = useChartSettings();
  const { data, isLoading, error } = usePriceHistory(timeRange);

  const handleDownload = useCallback(async () => {
    if (!chartRef.current) return;
    setIsExporting(true);
    try {
      await exportChartForX(chartRef.current, {
        filename: getChartFilename("sales-velocity", timeRange),
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
        <CardHeader><span className="text-lg font-bold font-brice">Daily Sales Count</span></CardHeader>
        <p className="text-foreground-muted text-center py-8">No data available</p>
      </Card>
    );
  }

  // Calculate 7-day rolling average
  const chartData = data.map((d, i) => {
    const slice = data.slice(Math.max(0, i - 6), i + 1);
    const ma7 = slice.reduce((sum, s) => sum + s.salesCount, 0) / slice.length;
    return { ...d, ma7: Math.round(ma7 * 10) / 10 };
  });

  const totalSales = data.reduce((sum, d) => sum + d.salesCount, 0);
  const avgDaily = totalSales / data.length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <Link href="/charts/sales-velocity" className="text-lg font-bold text-foreground font-brice hover:text-brand transition-colors">
            Sales Velocity
          </Link>
          <p className="export-branding text-sm text-brand font-mundial">Good Vibes Club</p>
          <CardDescription>Number of sales per day with 7D moving average</CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-bold text-foreground">{formatNumber(totalSales)}</p>
            <p className="text-[10px] text-foreground-muted">{timeRange}D Total</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleDownload} isLoading={isExporting}>
            <DownloadIcon className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <div ref={chartRef} className="px-1.5 py-3 bg-background-secondary rounded-lg chart-container">
        <div className="min-h-[120px] sm:min-h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="date"
                stroke="#71717a"
                fontSize={13}
                axisLine={false}
                tickLine={false}
                interval={Math.max(0, Math.floor(chartData.length / 6) - 1)}
                tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              />
              <YAxis stroke="#71717a" fontSize={13} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#141414", border: "1px solid #27272a", borderRadius: "8px" }}
                labelStyle={{ color: "#fafafa" }}
                formatter={(value, name) => [formatNumber(Number(value)), name === "salesCount" ? "Sales" : "7D Avg"]}
                labelFormatter={(label) => formatDate(label)}
              />
              <Bar dataKey="salesCount" name="Daily Sales" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} opacity={0.8} />
              <Line type="monotone" dataKey="ma7" name="7D Average" stroke={CHART_COLORS.danger} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="flex justify-between items-center mt-2 text-xs">
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-brand" />
              <span className="text-foreground-muted">Daily Sales</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-chart-danger" />
              <span className="text-foreground-muted">7D Average</span>
            </div>
          </div>
          <span className="text-foreground-muted">Avg: {avgDaily.toFixed(1)}/day</span>
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
