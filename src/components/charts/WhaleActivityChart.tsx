"use client";

import { useMemo, useState, useCallback } from "react";
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
import { OpenSeaLink, ChartStatCard, ChartStatGrid } from "@/components/ui";
import { useTraderAnalysis } from "@/hooks";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatEth, formatNumber } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import { CHART_MARGINS, AXIS_STYLE, GRID_STYLE, getTooltipContentStyle, EXPORT_MARGINS, EXPORT_AXIS_STYLE } from "@/lib/chartConfig";

// Truncate address for display
function truncateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WhaleActivityChart() {
  const [viewMode, setViewMode] = useState<"buyers" | "sellers">("buyers");
  const { timeRange } = useChartSettings();
  const { data, isLoading, error } = useTraderAnalysis(timeRange);

  const { chartData, totalVolume, topWalletShare } = useMemo(() => {
    if (!data) return { chartData: [], totalVolume: 0, topWalletShare: 0 };

    const activeData = viewMode === "buyers" ? data.topBuyers : data.topSellers;
    const crossData = viewMode === "buyers" ? data.topSellers : data.topBuyers;

    // Create a map of cross-activity for quick lookup
    const crossMap = new Map(crossData.map((w) => [w.address, w.count]));

    const top5 = activeData.slice(0, 5);
    const totalVol = activeData.reduce((sum, w) => sum + w.volume, 0);
    const top5Vol = top5.reduce((sum, w) => sum + w.volume, 0);

    return {
      chartData: top5.map((w) => ({
        ...w,
        shortAddress: truncateAddress(w.address),
        volumePercent: totalVol > 0 ? (w.volume / totalVol) * 100 : 0,
        crossCount: crossMap.get(w.address) || 0, // How many times they did the opposite action
      })),
      totalVolume: totalVol,
      topWalletShare: totalVol > 0 ? (top5Vol / totalVol) * 100 : 0,
    };
  }, [data, viewMode]);

  const exportConfig = useMemo(() => ({
    title: "Whale Activity",
    subtitle: `Top 5 ${viewMode === "buyers" ? "buyers" : "sellers"} by volume over ${timeRange} days`,
    legend: [
      { color: viewMode === "buyers" ? CHART_COLORS.success : CHART_COLORS.danger, label: viewMode === "buyers" ? "Buy Volume" : "Sell Volume", value: "ETH" },
    ],
    filename: getChartFilename(`whale-${viewMode}`, timeRange),
    statCards: [
      { label: "Top 5 Share", value: `${topWalletShare.toFixed(0)}%` },
      { label: "Total Volume", value: formatEth(totalVolume, 1) },
    ],
  }), [timeRange, viewMode, topWalletShare, totalVolume]);

  const color = viewMode === "buyers" ? CHART_COLORS.success : CHART_COLORS.danger;

  const legendItems: LegendItem[] = [
    { key: "volume", label: viewMode === "buyers" ? "Buy Volume" : "Sell Volume", color: viewMode === "buyers" ? CHART_COLORS.success : CHART_COLORS.danger },
  ];

  const viewToggle = (
    <div className="flex rounded-lg border border-border overflow-hidden">
      <button
        onClick={() => setViewMode("buyers")}
        className={`px-3 py-1.5 text-xs font-medium transition-colors ${
          viewMode === "buyers"
            ? "bg-chart-success text-background"
            : "text-foreground-muted hover:text-foreground hover:bg-border"
        }`}
      >
        Top Buyers
      </button>
      <button
        onClick={() => setViewMode("sellers")}
        className={`px-3 py-1.5 text-xs font-medium transition-colors ${
          viewMode === "sellers"
            ? "bg-chart-danger text-background"
            : "text-foreground-muted hover:text-foreground hover:bg-border"
        }`}
      >
        Top Sellers
      </button>
    </div>
  );

  // Render function for export - renders chart at specified dimensions
  // NOTE: Don't use ResponsiveContainer here - it doesn't work in off-screen portals
  const renderChart = useCallback((width: number, height: number) => (
    <BarChart
      data={chartData}
      layout="vertical"
      width={width}
      height={height}
      margin={EXPORT_MARGINS.horizontal}
    >
      <CartesianGrid strokeDasharray={GRID_STYLE.strokeDasharray} stroke={GRID_STYLE.stroke} vertical={GRID_STYLE.vertical} />
      <XAxis type="number" stroke={EXPORT_AXIS_STYLE.stroke} fontSize={EXPORT_AXIS_STYLE.fontSize} axisLine={EXPORT_AXIS_STYLE.axisLine} tickLine={EXPORT_AXIS_STYLE.tickLine} tickFormatter={(v) => formatEth(v, 1)} fontFamily={EXPORT_AXIS_STYLE.fontFamily} />
      <YAxis
        type="category"
        dataKey="shortAddress"
        stroke={EXPORT_AXIS_STYLE.stroke}
        fontSize={EXPORT_AXIS_STYLE.fontSize}
        axisLine={EXPORT_AXIS_STYLE.axisLine}
        tickLine={EXPORT_AXIS_STYLE.tickLine}
        width={80}
        fontFamily={EXPORT_AXIS_STYLE.fontFamily}
      />
      <Tooltip
        contentStyle={getTooltipContentStyle()}
        labelStyle={{ color: "#fafafa" }}
        content={({ active, payload }) => {
          if (!active || !payload?.length) return null;
          const d = payload[0]?.payload;
          const crossColor = viewMode === "buyers" ? CHART_COLORS.danger : CHART_COLORS.success;
          const crossLabel = viewMode === "buyers" ? "sells" : "buys";
          return (
            <div className="bg-background-secondary border border-border rounded-lg p-2 text-xs">
              <p className="font-mono text-foreground text-[10px]">{d.address}</p>
              <p className="text-foreground-muted mt-1">
                <span style={{ color }}>{formatNumber(d.count)} {viewMode === "buyers" ? "buys" : "sells"}</span>
                <span style={{ color: d.crossCount > 0 ? crossColor : "#71717a" }}> • {formatNumber(d.crossCount)} {crossLabel}</span>
              </p>
              <p className="text-foreground-muted">{formatEth(d.volume, 2)} volume ({d.volumePercent.toFixed(1)}%)</p>
              <p className="text-[10px] text-foreground-muted mt-1 italic">Click bar to view on OpenSea</p>
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
  ), [chartData, viewMode, color]);

  return (
    <StandardChartCard
      title="Whale Activity"
      href="/charts/whale-activity"
      description={`Largest wallets ranked by total ${viewMode === "buyers" ? "buy" : "sell"} volume`}
      legend={legendItems}
      headerControls={viewToggle}
      exportConfig={exportConfig}
      renderChart={renderChart}
      isLoading={isLoading}
      error={error}
      isEmpty={!data || chartData.length === 0}
      emptyMessage="No whale data available"
      stats={
        <ChartStatGrid columns={2}>
          <ChartStatCard
            label="Top 5 Share"
            value={`${topWalletShare.toFixed(0)}%`}
          />
          <ChartStatCard
            label="Total Volume"
            value={formatEth(totalVolume, 1)}
          />
        </ChartStatGrid>
      }
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 min-h-[280px] sm:min-h-[400px]">
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
                width={65}
                fontFamily={AXIS_STYLE.fontFamily}
              />
              <Tooltip
                contentStyle={getTooltipContentStyle()}
                labelStyle={{ color: "#fafafa" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  const crossColor = viewMode === "buyers" ? CHART_COLORS.danger : CHART_COLORS.success;
                  const crossLabel = viewMode === "buyers" ? "sells" : "buys";
                  return (
                    <div className="bg-background-secondary border border-border rounded-lg p-2 text-xs">
                      <p className="font-mono text-foreground text-[10px]">{d.address}</p>
                      <p className="text-foreground-muted mt-1">
                        <span style={{ color }}>{formatNumber(d.count)} {viewMode === "buyers" ? "buys" : "sells"}</span>
                        <span style={{ color: d.crossCount > 0 ? crossColor : "#71717a" }}> • {formatNumber(d.crossCount)} {crossLabel}</span>
                      </p>
                      <p className="text-foreground-muted">{formatEth(d.volume, 2)} volume ({d.volumePercent.toFixed(1)}%)</p>
                      <p className="text-[10px] text-foreground-muted mt-1 italic">Click bar to view on OpenSea</p>
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

        {/* Stats row - inside export area */}
        <div className="grid grid-cols-3 gap-1 sm:gap-2 mt-2 text-[10px] sm:text-xs text-center">
          {chartData.slice(0, 3).map((whale, i) => {
            const crossColor = viewMode === "buyers" ? CHART_COLORS.danger : CHART_COLORS.success;
            const crossLabel = viewMode === "buyers" ? "sells" : "buys";
            return (
              <div key={i} className="bg-background-tertiary rounded p-2">
                <p className="font-mono text-[10px] text-foreground-muted flex items-center justify-center gap-1">
                  <span className="truncate">{whale.shortAddress}</span>
                  <OpenSeaLink type="wallet" value={whale.address} size={10} />
                </p>
                <p className="font-bold" style={{ color }}>{formatNumber(whale.count)} {viewMode === "buyers" ? "buys" : "sells"}</p>
                <p className="text-[10px]" style={{ color: whale.crossCount > 0 ? crossColor : "#71717a" }}>{formatNumber(whale.crossCount)} {crossLabel}</p>
              </div>
            );
          })}
        </div>
      </div>
    </StandardChartCard>
  );
}
