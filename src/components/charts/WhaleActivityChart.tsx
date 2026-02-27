"use client";

import { useMemo, useState } from "react";
import { getChartFilename } from "@/lib/chartExport/index";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { StandardChartCard, LegendItem } from "@/components/charts/StandardChartCard";
import { OpenSeaLink, ChartStatCard, ChartStatGrid, ToggleButtonGroup } from "@/components/ui";
import { useTraderAnalysis } from "@/hooks";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatEth, formatNumber } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import { CHART_MARGINS, AXIS_STYLE, GRID_STYLE, getTooltipContentStyle } from "@/lib/chartConfig";
import { FONT_SIZE } from "@/lib/tokens";

// Truncate address for display
function truncateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WhaleActivityChart() {
  const [viewMode, setViewMode] = useState<"buyers" | "sellers">("buyers");
  const { timeRange } = useChartSettings();
  const { data, isLoading, error } = useTraderAnalysis(timeRange);

  const { chartData, totalVolume, top5Count } = useMemo(() => {
    if (!data) return { chartData: [], totalVolume: 0, top5Count: 0 };

    const activeData = viewMode === "buyers" ? data.topBuyers : data.topSellers;
    const crossData = viewMode === "buyers" ? data.topSellers : data.topBuyers;

    // Create a map of cross-activity for quick lookup
    const crossMap = new Map(crossData.map((w) => [w.address, w.count]));

    // Sort by total volume (descending) and take top 5
    const top5 = [...activeData]
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5);
    const totalVol = activeData.reduce((sum, w) => sum + w.volume, 0);
    const top5Total = top5.reduce((sum, w) => sum + w.count, 0);

    return {
      chartData: top5.map((w) => ({
        ...w,
        shortAddress: truncateAddress(w.address),
        volumePercent: totalVol > 0 ? (w.volume / totalVol) * 100 : 0,
        crossCount: crossMap.get(w.address) || 0, // How many times they did the opposite action
      })),
      totalVolume: totalVol,
      top5Count: top5Total,
    };
  }, [data, viewMode]);

  const exportConfig = useMemo(() => ({
    title: "Whale Activity",
    filename: getChartFilename(`whale-${viewMode}`, timeRange),
  }), [timeRange, viewMode]);

  const color = viewMode === "buyers" ? CHART_COLORS.success : CHART_COLORS.danger;

  const legendItems: LegendItem[] = [
    { key: "volume", label: viewMode === "buyers" ? "Buy Volume" : "Sell Volume", color: viewMode === "buyers" ? CHART_COLORS.success : CHART_COLORS.danger },
  ];

  const viewToggle = (
    <ToggleButtonGroup
      options={[
        { value: "buyers", label: "Top Buyers" },
        { value: "sellers", label: "Top Sellers" },
      ]}
      value={viewMode}
      onChange={setViewMode}
      activeColor={viewMode === "buyers" ? "bg-chart-success" : "bg-chart-danger"}
      size="md"
    />
  );

  return (
    <StandardChartCard
      title="Whale Activity"
      href="/charts/whale-activity"
      description={`Largest wallets ranked by total ${viewMode === "buyers" ? "buy" : "sell"} volume`}
      legend={legendItems}
      headerControls={viewToggle}
      exportConfig={exportConfig}
      isLoading={isLoading}
      error={error}
      isEmpty={!data || chartData.length === 0}
      emptyMessage="No whale data available"
      stats={
        <ChartStatGrid columns={2}>
          <ChartStatCard
            label={viewMode === "buyers" ? "Top 5 Total Purchases" : "Top 5 Total Sales"}
            value={<span style={{ color }}>{formatNumber(top5Count)}</span>}
          />
          <ChartStatCard
            label="Total Volume"
            value={<span style={{ color }}>{formatEth(totalVolume, 1)}</span>}
          />
        </ChartStatGrid>
      }
    >
      <div className="flex flex-col h-full">
        {/* Top 3 wallets - above chart */}
        <div className="grid grid-cols-3 gap-1 mb-1.5 sm:text-xs text-center" style={{ fontSize: FONT_SIZE.xs }}>
          {chartData.slice(0, 3).map((whale, i) => {
            const crossColor = viewMode === "buyers" ? CHART_COLORS.danger : CHART_COLORS.success;
            const crossLabel = viewMode === "buyers" ? "sells" : "buys";
            const medals = ["🥇", "🥈", "🥉"];
            return (
              <div key={i} className="bg-background-tertiary rounded p-1.5">
                <p className="font-mono text-foreground-muted flex items-center justify-center gap-1" style={{ fontSize: FONT_SIZE.xs }}>
                  {viewMode === "buyers" ? <span>{medals[i]}</span> : <span>💩</span>}
                  <span className="truncate">{whale.shortAddress}</span>
                  <OpenSeaLink type="wallet" value={whale.address} size={10} />
                </p>
                <p className="font-bold" style={{ color }}>{formatNumber(whale.count)} {viewMode === "buyers" ? "buys" : "sells"}</p>
                <p style={{ fontSize: FONT_SIZE.xs, color: whale.crossCount > 0 ? crossColor : "#71717a" }}>{formatNumber(whale.crossCount)} {crossLabel}</p>
              </div>
            );
          })}
        </div>

        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={CHART_MARGINS.horizontal}
            >
              <CartesianGrid strokeDasharray={GRID_STYLE.strokeDasharray} stroke={GRID_STYLE.stroke} vertical={GRID_STYLE.vertical} />
              <XAxis type="number" stroke={AXIS_STYLE.stroke} fontSize={AXIS_STYLE.fontSize} axisLine={AXIS_STYLE.axisLine} tickLine={AXIS_STYLE.tickLine} tickFormatter={(v) => formatEth(v, 1)} fontFamily={AXIS_STYLE.fontFamily} />
              <YAxis
                type="category"
                dataKey="shortAddress"
                stroke={AXIS_STYLE.stroke}
                fontSize={AXIS_STYLE.fontSize}
                axisLine={AXIS_STYLE.axisLine}
                tickLine={AXIS_STYLE.tickLine}
                width={60}
                fontFamily={AXIS_STYLE.fontFamily}
              />
              <Tooltip
                contentStyle={getTooltipContentStyle()}
                labelStyle={{ color: "#ffffff" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  const crossColor = viewMode === "buyers" ? CHART_COLORS.danger : CHART_COLORS.success;
                  const crossLabel = viewMode === "buyers" ? "sells" : "buys";
                  return (
                    <div className="bg-background-secondary border border-border rounded-lg p-2 text-xs">
                      <p className="font-mono text-foreground" style={{ fontSize: FONT_SIZE.xs }}>{d.address}</p>
                      <p className="text-foreground-muted mt-1">
                        <span style={{ color }}>{formatNumber(d.count)} {viewMode === "buyers" ? "buys" : "sells"}</span>
                        <span style={{ color: d.crossCount > 0 ? crossColor : "#71717a" }}> • {formatNumber(d.crossCount)} {crossLabel}</span>
                      </p>
                      <p className="text-foreground-muted">{formatEth(d.volume, 2)} volume ({d.volumePercent.toFixed(1)}%)</p>
                      <p className="text-foreground-muted mt-1 italic" style={{ fontSize: FONT_SIZE.xs }}>Click bar to view on OpenSea</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="volume" radius={[0, 4, 4, 0]} className="cursor-pointer">
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={color}
                    className="cursor-pointer"
                    onClick={() => window.open(`https://opensea.io/${entry.address}`, "_blank")}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </StandardChartCard>
  );
}
