"use client";

import { useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ChartStatCard, ChartStatGrid } from "@/components/ui";
import { StandardChartCard } from "@/components/charts/StandardChartCard";
import { useNFTTrades } from "@/hooks/vibestr/useNFTTrades";
import { formatNumber, formatEth } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import {
  CHART_MARGINS,
  AXIS_STYLE,
  GRID_STYLE,
  getTooltipContentStyle,
} from "@/lib/chartConfig";
import { getChartFilename } from "@/lib/chartExport";

interface TradePoint {
  x: number; // timestamp
  y: number; // price in ETH
  action: "buy" | "sell";
  tokenId: string;
  profit?: number;
}

export function NFTTradeHistoryChart() {
  const { data: trades, isLoading, error, refetch } = useNFTTrades();

  const { buyPoints, sellPoints } = useMemo(() => {
    if (!trades || trades.length === 0) return { buyPoints: [], sellPoints: [] };

    const buys: TradePoint[] = [];
    const sells: TradePoint[] = [];

    trades.forEach((trade) => {
      const point: TradePoint = {
        x: trade.timestamp * 1000, // Convert to ms
        y: trade.price,
        action: trade.action,
        tokenId: trade.tokenId,
        profit: trade.profit,
      };

      if (trade.action === "buy") {
        buys.push(point);
      } else {
        sells.push(point);
      }
    });

    return { buyPoints: buys, sellPoints: sells };
  }, [trades]);

  const totalBuys = buyPoints.length;
  const totalSells = sellPoints.length;
  const avgBuyPrice = totalBuys > 0
    ? buyPoints.reduce((sum, p) => sum + p.y, 0) / totalBuys
    : 0;
  const avgSellPrice = totalSells > 0
    ? sellPoints.reduce((sum, p) => sum + p.y, 0) / totalSells
    : 0;
  const totalProfit = sellPoints.reduce((sum, p) => sum + (p.profit || 0), 0);

  const legendItems = [
    { key: "buys", label: `Buys (${totalBuys})`, color: CHART_COLORS.success, active: true },
    { key: "sells", label: `Sells (${totalSells})`, color: CHART_COLORS.danger, active: true },
  ];

  const exportConfig = useMemo(
    () => ({
      filename: getChartFilename("vibestr-nft-trades"),
      title: "NFT Trade History",
    }),
    []
  );

  const allPoints = [...buyPoints, ...sellPoints];

  return (
    <StandardChartCard
      title="NFT Trade History"
      description="Strategy contract NFT buys and sells"
      legend={legendItems}
      exportConfig={exportConfig}
      isLoading={isLoading}
      error={error}
      onRetry={refetch}
      isEmpty={allPoints.length === 0}
      emptyMessage="No NFT trade data available"
      stats={
        <ChartStatGrid columns={4}>
          <ChartStatCard label="Total Buys" value={formatNumber(totalBuys)} />
          <ChartStatCard label="Avg Buy" value={formatEth(avgBuyPrice, 3)} />
          <ChartStatCard label="Total Sells" value={formatNumber(totalSells)} />
          <ChartStatCard
            label="Total Profit"
            value={formatEth(totalProfit, 3)}
            change={totalProfit}
          />
        </ChartStatGrid>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={CHART_MARGINS.default}>
          <CartesianGrid strokeDasharray={GRID_STYLE.strokeDasharray} stroke={GRID_STYLE.stroke} vertical={GRID_STYLE.vertical} />
          <XAxis
            dataKey="x"
            type="number"
            domain={["auto", "auto"]}
            stroke={AXIS_STYLE.stroke}
            fontSize={AXIS_STYLE.fontSize}
            fontFamily={AXIS_STYLE.fontFamily}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            tickFormatter={(v) =>
              new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            }
          />
          <YAxis
            dataKey="y"
            type="number"
            domain={["auto", "auto"]}
            stroke={AXIS_STYLE.stroke}
            fontSize={AXIS_STYLE.fontSize}
            fontFamily={AXIS_STYLE.fontFamily}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            width={45}
            tickFormatter={(v) => `${v.toFixed(2)}Ξ`}
          />
          <Tooltip
            contentStyle={getTooltipContentStyle()}
            labelStyle={{ color: "#ffffff" }}
            content={({ payload }) => {
              if (!payload || payload.length === 0) return null;
              const point = payload[0]?.payload as TradePoint;
              if (!point) return null;
              return (
                <div style={{ ...getTooltipContentStyle(), padding: "8px 12px" }}>
                  <div style={{ color: "#fff", fontSize: 12, marginBottom: 4 }}>
                    {new Date(point.x).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                  <div style={{ color: point.action === "buy" ? CHART_COLORS.success : CHART_COLORS.danger, fontSize: 13, fontWeight: 600 }}>
                    {point.action === "buy" ? "Bought" : "Sold"} #{point.tokenId}
                  </div>
                  <div style={{ color: "#a1a1aa", fontSize: 12 }}>
                    {point.y.toFixed(3)} ETH
                  </div>
                  {point.profit !== undefined && (
                    <div style={{ color: point.profit >= 0 ? CHART_COLORS.success : CHART_COLORS.danger, fontSize: 12 }}>
                      P/L: {point.profit >= 0 ? "+" : ""}{point.profit.toFixed(3)} ETH
                    </div>
                  )}
                </div>
              );
            }}
          />
          <Scatter name="Buys" data={buyPoints}>
            {buyPoints.map((_, index) => (
              <Cell key={`buy-${index}`} fill={CHART_COLORS.success} opacity={0.8} />
            ))}
          </Scatter>
          <Scatter name="Sells" data={sellPoints}>
            {sellPoints.map((_, index) => (
              <Cell key={`sell-${index}`} fill={CHART_COLORS.danger} opacity={0.8} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </StandardChartCard>
  );
}
