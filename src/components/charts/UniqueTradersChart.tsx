"use client";

import { useRef, useMemo } from "react";
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
import { useTraderAnalysis } from "@/hooks";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatDate, formatNumber } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";

export function UniqueTradersChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const { timeRange } = useChartSettings();
  const { data, isLoading, error } = useTraderAnalysis(timeRange);

  const exportConfig = useMemo(() => ({
    title: "Unique Traders",
    subtitle: `Distinct wallets trading each day over ${timeRange} days`,
    legend: [
      { color: CHART_COLORS.success, label: "Unique Buyers", value: "Daily" },
      { color: CHART_COLORS.danger, label: "Unique Sellers", value: "Daily" },
      { color: CHART_COLORS.info, label: "New Buyers", value: "First-time" },
    ],
    filename: getChartFilename("unique-traders", timeRange),
  }), [timeRange]);

  const { chartData, avgBuyers, avgSellers, newBuyerRate, isWeekly } = useMemo(() => {
    if (!data || data.dailyStats.length === 0) {
      return { chartData: [], avgBuyers: 0, avgSellers: 0, newBuyerRate: 0, isWeekly: false };
    }

    const totalBuyers = data.dailyStats.reduce((sum, d) => sum + d.uniqueBuyers, 0);
    const totalSellers = data.dailyStats.reduce((sum, d) => sum + d.uniqueSellers, 0);
    const totalNew = data.dailyStats.reduce((sum, d) => sum + d.newBuyers, 0);
    const totalAll = data.dailyStats.reduce((sum, d) => sum + d.uniqueBuyers, 0);

    // For 30D and 90D, aggregate to weekly data
    const useWeekly = timeRange >= 30;

    let processedData = data.dailyStats;
    if (useWeekly) {
      // Group by week (Sunday start)
      const weeks: Record<string, { date: string; uniqueBuyers: number; uniqueSellers: number; newBuyers: number; count: number }> = {};

      for (const day of data.dailyStats) {
        const date = new Date(day.date);
        // Get Sunday of the week
        const sunday = new Date(date);
        sunday.setDate(date.getDate() - date.getDay());
        const weekKey = sunday.toISOString().split('T')[0];

        if (!weeks[weekKey]) {
          weeks[weekKey] = { date: weekKey, uniqueBuyers: 0, uniqueSellers: 0, newBuyers: 0, count: 0 };
        }
        weeks[weekKey].uniqueBuyers += day.uniqueBuyers;
        weeks[weekKey].uniqueSellers += day.uniqueSellers;
        weeks[weekKey].newBuyers += day.newBuyers;
        weeks[weekKey].count += 1;
      }

      // Convert to array and sort by date
      processedData = Object.values(weeks)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((w) => ({
          date: w.date,
          uniqueBuyers: Math.round(w.uniqueBuyers / w.count), // Weekly average per day
          uniqueSellers: Math.round(w.uniqueSellers / w.count),
          newBuyers: Math.round(w.newBuyers / w.count),
          totalTrades: 0,
          repeatBuyers: 0,
        }));
    }

    return {
      chartData: processedData,
      avgBuyers: totalBuyers / data.dailyStats.length,
      avgSellers: totalSellers / data.dailyStats.length,
      newBuyerRate: totalAll > 0 ? (totalNew / totalAll) * 100 : 0,
      isWeekly: useWeekly,
    };
  }, [data, timeRange]);

  if (isLoading) return <ChartSkeleton />;
  if (error || !data || data.dailyStats.length === 0) {
    return (
      <Card>
        <CardHeader><span className="text-lg font-bold font-brice">Unique Traders</span></CardHeader>
        <p className="text-foreground-muted text-center py-8">No trader data available</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <Link href="/charts/unique-traders" className="text-lg font-bold text-foreground font-brice hover:text-brand transition-colors">
            Unique Traders
          </Link>
          <p className="export-branding text-sm text-brand font-mundial">Good Vibes Club</p>
          <CardDescription>Distinct wallets trading {isWeekly ? "each week (avg/day)" : "each day"}</CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-3 text-right text-xs">
            <div>
              <p className="font-bold text-chart-success">{avgBuyers.toFixed(1)}</p>
              <p className="text-foreground-muted">Avg Buyers/Day</p>
            </div>
            <div>
              <p className="font-bold text-chart-danger">{avgSellers.toFixed(1)}</p>
              <p className="text-foreground-muted">Avg Sellers/Day</p>
            </div>
            <div>
              <p className="font-bold text-chart-info">{newBuyerRate.toFixed(0)}%</p>
              <p className="text-foreground-muted">New Buyers</p>
            </div>
          </div>
          <ChartExportButtons chartRef={chartRef} config={exportConfig} />
        </div>
      </CardHeader>

      <div ref={chartRef} className="px-1 pt-1 bg-background-secondary rounded-lg chart-container flex-1 flex flex-col">
        <div className="flex-1 min-h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 8, left: -5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#71717a"
                fontSize={11}
                fontFamily="var(--font-mundial)"
                axisLine={false}
                tickLine={false}
                interval={isWeekly ? 0 : Math.max(0, Math.floor(chartData.length / 6) - 1)}
                tickFormatter={(v) => {
                  const date = new Date(v);
                  if (isWeekly) {
                    const endDate = new Date(date);
                    endDate.setDate(date.getDate() + 6);
                    const startStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    const endStr = endDate.getDate().toString();
                    return `${startStr}-${endStr}`;
                  }
                  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                }}
              />
              <YAxis stroke="#71717a" fontSize={11} fontFamily="var(--font-mundial)" axisLine={false} tickLine={false} width={35} />
              <Tooltip
                contentStyle={{ backgroundColor: "#141414", border: "1px solid #27272a", borderRadius: "8px" }}
                labelStyle={{ color: "#fafafa" }}
                formatter={(value, name) => {
                  const labels: Record<string, string> = {
                    uniqueBuyers: "Unique Buyers",
                    uniqueSellers: "Unique Sellers",
                    newBuyers: "New Buyers",
                  };
                  return [formatNumber(Number(value)), labels[name as string] || name];
                }}
                labelFormatter={(l) => {
                  if (isWeekly) {
                    const date = new Date(l);
                    const endDate = new Date(date);
                    endDate.setDate(date.getDate() + 6);
                    return `${formatDate(l)} - ${formatDate(endDate.toISOString())}`;
                  }
                  return formatDate(l);
                }}
              />
              <Bar
                dataKey="uniqueBuyers"
                name="uniqueBuyers"
                fill={CHART_COLORS.success}
                radius={[4, 4, 0, 0]}
                opacity={0.8}
              />
              <Bar
                dataKey="uniqueSellers"
                name="uniqueSellers"
                fill={CHART_COLORS.danger}
                radius={[4, 4, 0, 0]}
                opacity={0.8}
              />
              <Line
                type="monotone"
                dataKey="newBuyers"
                name="newBuyers"
                stroke={CHART_COLORS.info}
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legend + repeat buyer stat */}
        <div className="flex items-center justify-between mt-2 text-xs">
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: CHART_COLORS.success }} />
              <span className="text-foreground-muted">Buyers</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: CHART_COLORS.danger }} />
              <span className="text-foreground-muted">Sellers</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-0.5 rounded" style={{ backgroundColor: CHART_COLORS.info }} />
              <span className="text-foreground-muted">New</span>
            </div>
          </div>
          <span className="text-foreground-muted"><span className="font-medium text-brand">{data.repeatBuyerRate}%</span> repeat buyers</span>
        </div>
      </div>
    </Card>
  );
}
