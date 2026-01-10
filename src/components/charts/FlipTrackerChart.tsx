"use client";

import { useRef, useMemo } from "react";
import { getChartFilename } from "@/lib/chartExport/index";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import Link from "next/link";
import { Card, CardHeader, CardDescription } from "@/components/ui";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { ChartExportButtons } from "./ChartExportButtons";
import { useTraderAnalysis } from "@/hooks";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatEth, formatPercent } from "@/lib/utils";
import { CHART_COLORS, CONTRACT_ADDRESS } from "@/lib/constants";

export function FlipTrackerChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const { timeRange } = useChartSettings();
  const { data, isLoading, error } = useTraderAnalysis(timeRange);

  const exportConfig = useMemo(() => ({
    title: "Flip Tracker",
    subtitle: `Tokens bought and sold within ${timeRange} days (X = hold time, Y = profit %)`,
    legend: [
      { color: CHART_COLORS.success, label: "Profitable Flip", value: "Gain" },
      { color: CHART_COLORS.danger, label: "Loss Flip", value: "Loss" },
    ],
    filename: getChartFilename("flip-tracker", timeRange),
  }), [timeRange]);

  const { chartData, profitableFlips, avgProfit, avgHoldingDays } = useMemo(() => {
    if (!data || data.flips.length === 0) {
      return { chartData: [], profitableFlips: 0, avgProfit: 0, avgHoldingDays: 0 };
    }

    // Filter to reasonable flips (holding period 0-180 days)
    const validFlips = data.flips.filter((f) => f.holdingDays >= 0 && f.holdingDays <= 180);

    const profitable = validFlips.filter((f) => f.profitPercent > 0).length;
    const avgProfitPct = validFlips.length > 0
      ? validFlips.reduce((sum, f) => sum + f.profitPercent, 0) / validFlips.length
      : 0;

    return {
      chartData: validFlips.slice(0, 100), // Limit for performance
      profitableFlips: validFlips.length > 0 ? (profitable / validFlips.length) * 100 : 0,
      avgProfit: avgProfitPct,
      avgHoldingDays: data.avgHoldingPeriod,
    };
  }, [data]);

  if (isLoading) return <ChartSkeleton />;
  if (error || !data || chartData.length === 0) {
    return (
      <Card>
        <CardHeader><span className="text-lg font-bold font-brice">Flip Tracker</span></CardHeader>
        <p className="text-foreground-muted text-center py-8">No flip data available</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <Link href="/charts/flip-tracker" className="text-lg font-bold text-foreground font-brice hover:text-brand transition-colors">
            Flip Tracker
          </Link>
          <p className="export-branding text-sm text-brand font-mundial">Good Vibes Club</p>
          <CardDescription>Tokens bought & sold within {timeRange}D. X = hold time, Y = profit %</CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex gap-3 text-right text-xs">
            <div>
              <p className="font-bold" style={{ color: profitableFlips > 50 ? CHART_COLORS.success : CHART_COLORS.danger }}>
                {profitableFlips.toFixed(0)}%
              </p>
              <p className="text-foreground-muted">Profitable</p>
            </div>
            <div>
              <p className="font-bold" style={{ color: avgProfit > 0 ? CHART_COLORS.success : CHART_COLORS.danger }}>
                {avgProfit > 0 ? "+" : ""}{avgProfit.toFixed(1)}%
              </p>
              <p className="text-foreground-muted">Avg Return</p>
            </div>
            <div>
              <p className="font-bold text-chart-info">{avgHoldingDays.toFixed(0)}d</p>
              <p className="text-foreground-muted">Avg Hold</p>
            </div>
          </div>
          <ChartExportButtons chartRef={chartRef} config={exportConfig} />
        </div>
      </CardHeader>

      <div ref={chartRef} className="px-1 pt-1 bg-background-secondary rounded-lg chart-container flex-1 flex flex-col">
        <div className="flex-1 h-[120px] sm:h-[280px] landscape:h-[35vh]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 5, right: 8, left: -5, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                type="number"
                dataKey="holdingDays"
                name="Holding Days"
                stroke="#71717a"
                fontSize={11}
                fontFamily="var(--font-mundial)"
                axisLine={false}
                tickLine={false}
                label={{ value: "Hold Time (Days)", position: "bottom", fill: "#71717a", fontSize: 10 }}
              />
              <YAxis
                type="number"
                dataKey="profitPercent"
                name="Profit %"
                stroke="#71717a"
                fontSize={11}
                fontFamily="var(--font-mundial)"
                axisLine={false}
                tickLine={false}
                width={40}
                tickFormatter={(v) => `${v}%`}
                label={{ value: "Return", angle: -90, position: "insideLeft", fill: "#71717a", fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "#141414", border: "1px solid #27272a", borderRadius: "8px" }}
                labelStyle={{ color: "#fafafa" }}
                formatter={(value, name) => {
                  if (name === "Profit %") return [`${Number(value).toFixed(1)}%`, "Return"];
                  if (name === "Holding Days") return [`${value} days`, "Held"];
                  return [value, name];
                }}
                labelFormatter={() => ""}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div className="bg-background-secondary border border-border rounded-lg p-2 text-xs">
                      <p className="font-bold text-foreground">Token #{d.tokenId}</p>
                      <p className="text-foreground-muted">
                        Buy: {formatEth(d.buyPrice, 3)} → Sell: {formatEth(d.sellPrice, 3)}
                      </p>
                      <p style={{ color: d.profitPercent > 0 ? CHART_COLORS.success : CHART_COLORS.danger }}>
                        {d.profitPercent > 0 ? "+" : ""}{d.profitPercent.toFixed(1)}% ({d.holdingDays}d)
                      </p>
                      <p className="text-[10px] text-foreground-muted mt-1 italic">Click to view on OpenSea</p>
                    </div>
                  );
                }}
              />
              <ReferenceLine y={0} stroke={CHART_COLORS.muted} strokeDasharray="5 5" />
              <Scatter name="Flips" data={chartData} className="cursor-pointer">
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.profitPercent > 0 ? CHART_COLORS.success : CHART_COLORS.danger}
                    opacity={0.7}
                    className="cursor-pointer"
                    onClick={() => window.open(`https://opensea.io/assets/ethereum/${CONTRACT_ADDRESS}/${entry.tokenId}`, "_blank")}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-5 mt-2 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS.success }} />
            <span className="text-foreground-muted">Profit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS.danger }} />
            <span className="text-foreground-muted">Loss</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
