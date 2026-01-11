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
import { Card, CardHeader, CardDescription, ChartLegendToggle, ChartStatCard, ChartStatGrid } from "@/components/ui";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { ChartExportButtons } from "./ChartExportButtons";
import { useTraderAnalysis } from "@/hooks";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatEth, formatPercent } from "@/lib/utils";
import { CHART_COLORS, CONTRACT_ADDRESS } from "@/lib/constants";
import { CHART_MARGINS, AXIS_STYLE, GRID_STYLE, CHART_HEIGHT, getTooltipContentStyle } from "@/lib/chartConfig";

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

  const legendItems = [
    { key: "profit", label: "Profit", color: CHART_COLORS.success },
    { key: "loss", label: "Loss", color: CHART_COLORS.danger },
  ];

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
          <CardDescription>Tokens bought & sold within {timeRange}D. X = hold time, Y = profit %</CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <ChartExportButtons chartRef={chartRef} config={exportConfig} />
        </div>
      </CardHeader>
      <div className="flex items-center px-3 mb-3">
        <ChartLegendToggle items={legendItems} />
      </div>

      <div ref={chartRef} className="p-3 bg-background-secondary rounded-lg chart-container flex-1 flex flex-col">
        <div className="flex-1 min-h-[320px] sm:min-h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 5, right: 12, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray={GRID_STYLE.strokeDasharray} stroke={GRID_STYLE.stroke} vertical={GRID_STYLE.vertical} />
              <XAxis
                type="number"
                dataKey="holdingDays"
                name="Holding Days"
                stroke={AXIS_STYLE.stroke}
                fontSize={AXIS_STYLE.fontSize}
                fontFamily={AXIS_STYLE.fontFamily}
                axisLine={AXIS_STYLE.axisLine}
                tickLine={AXIS_STYLE.tickLine}
                label={{ value: "Hold Time (Days)", position: "bottom", fill: AXIS_STYLE.stroke, fontSize: 10 }}
              />
              <YAxis
                type="number"
                dataKey="profitPercent"
                name="Profit %"
                stroke={AXIS_STYLE.stroke}
                fontSize={AXIS_STYLE.fontSize}
                fontFamily={AXIS_STYLE.fontFamily}
                axisLine={AXIS_STYLE.axisLine}
                tickLine={AXIS_STYLE.tickLine}
                width={40}
                tickFormatter={(v) => `${v}%`}
                label={{ value: "Return", angle: -90, position: "insideLeft", fill: AXIS_STYLE.stroke, fontSize: 10 }}
              />
              <Tooltip
                contentStyle={getTooltipContentStyle()}
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

      </div>
      <ChartStatGrid columns={3}>
        <ChartStatCard
          label="Profitable"
          value={`${profitableFlips.toFixed(0)}%`}
        />
        <ChartStatCard
          label="Avg Return"
          value={`${avgProfit > 0 ? "+" : ""}${avgProfit.toFixed(1)}%`}
        />
        <ChartStatCard
          label="Avg Hold"
          value={`${avgHoldingDays.toFixed(0)}d`}
        />
      </ChartStatGrid>
    </Card>
  );
}
