"use client";

import { useMemo, useState } from "react";
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
import { StandardChartCard, LegendItem } from "@/components/charts/StandardChartCard";
import { ChartStatCard, ChartStatGrid } from "@/components/ui";
import { useTraderAnalysis } from "@/hooks";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatEth } from "@/lib/utils";
import { CHART_COLORS, CONTRACT_ADDRESS } from "@/lib/constants";
import { AXIS_STYLE, GRID_STYLE, getTooltipContentStyle } from "@/lib/chartConfig";

export function FlipTrackerChart() {
  const { timeRange } = useChartSettings();
  const { data, isLoading, error } = useTraderAnalysis(timeRange);
  const [visibleSeries, setVisibleSeries] = useState<Set<string>>(
    new Set(["profit", "loss"])
  );

  const handleLegendToggle = (key: string) => {
    setVisibleSeries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const legendItems: LegendItem[] = [
    { key: "profit", label: "Profit", color: CHART_COLORS.success, active: visibleSeries.has("profit") },
    { key: "loss", label: "Loss", color: CHART_COLORS.danger, active: visibleSeries.has("loss") },
  ];

  const { chartData, profitableFlips, avgProfit, avgHoldingDays } = useMemo(() => {
    if (!data || data.flips.length === 0) {
      return { chartData: [], profitableFlips: 0, avgProfit: 0, avgHoldingDays: 0 };
    }

    // Filter to reasonable flips (holding period 0-180 days)
    const validFlips = data.flips.filter((f) => f.holdingDays >= 0 && f.holdingDays <= 180);

    // Filter based on visible series
    const filteredFlips = validFlips.filter((f) => {
      if (f.profitPercent > 0 && visibleSeries.has("profit")) return true;
      if (f.profitPercent <= 0 && visibleSeries.has("loss")) return true;
      return false;
    });

    const profitable = validFlips.filter((f) => f.profitPercent > 0).length;
    const avgProfitPct = validFlips.length > 0
      ? validFlips.reduce((sum, f) => sum + f.profitPercent, 0) / validFlips.length
      : 0;

    return {
      chartData: filteredFlips.slice(0, 100), // Limit for performance
      profitableFlips: validFlips.length > 0 ? (profitable / validFlips.length) * 100 : 0,
      avgProfit: avgProfitPct,
      avgHoldingDays: data.avgHoldingPeriod,
    };
  }, [data, visibleSeries]);

  const exportConfig = useMemo(() => ({
    title: "Flip Tracker",
    filename: getChartFilename("flip-tracker", timeRange),
  }), [timeRange]);

  return (
    <StandardChartCard
      title="Flip Tracker"
      href="/charts/flip-tracker"
      description="Quick resales showing hold duration vs profit margin"
      legend={legendItems}
      onLegendToggle={handleLegendToggle}
      exportConfig={exportConfig}
      isLoading={isLoading}
      error={error}
      isEmpty={!data || data.flips.length === 0}
      emptyMessage="No flip data available"
      stats={
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
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
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
    </StandardChartCard>
  );
}
