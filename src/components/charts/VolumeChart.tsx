"use client";

import { useRef, useState, useCallback } from "react";
import { exportChartForX, getChartFilename } from "@/lib/chartExport";
import {
  BarChart,
  Bar,
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
import { formatEth, formatUsd, formatDate } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";

export function VolumeChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const { timeRange, currency } = useChartSettings();
  const { data, isLoading, error } = usePriceHistory(timeRange);

  const handleDownload = useCallback(async () => {
    if (!chartRef.current) return;
    setIsExporting(true);
    try {
      await exportChartForX(chartRef.current, {
        filename: getChartFilename("volume", timeRange),
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
        <CardHeader><span className="text-lg font-bold font-brice">Daily Trading Volume</span></CardHeader>
        <p className="text-foreground-muted text-center py-8">No data available</p>
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    displayVolume: currency === "eth" ? d.volume : d.volumeUsd,
  }));

  const totalVolume = chartData.reduce((sum, d) => sum + d.displayVolume, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <Link href="/charts/volume" className="text-lg font-bold text-foreground font-brice hover:text-brand transition-colors">
            Trading Volume
          </Link>
          <p className="export-branding text-sm text-brand font-mundial">Good Vibes Club</p>
          <CardDescription>Total ETH traded per day</CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-bold text-foreground">
              {currency === "eth" ? formatEth(totalVolume, 1) : formatUsd(totalVolume)}
            </p>
            <p className="text-[10px] text-foreground-muted">{timeRange}D Total</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleDownload} isLoading={isExporting}>
            <DownloadIcon className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <div ref={chartRef} className="px-1.5 py-3 bg-background-secondary rounded-lg chart-container">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#71717a"
                fontSize={13}
                axisLine={false}
                tickLine={false}
                interval={Math.max(0, Math.floor(chartData.length / 6) - 1)}
                tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              />
              <YAxis
                stroke="#71717a"
                fontSize={13}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => currency === "eth" ? `${v.toFixed(1)}` : `$${(v/1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "#141414", border: "1px solid #27272a", borderRadius: "8px" }}
                labelStyle={{ color: "#fafafa" }}
                formatter={(value) => [currency === "eth" ? formatEth(Number(value), 2) : formatUsd(Number(value)), "Volume"]}
                labelFormatter={(label) => formatDate(label)}
              />
              <Bar dataKey="displayVolume" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
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
