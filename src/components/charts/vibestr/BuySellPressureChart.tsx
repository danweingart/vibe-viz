"use client";

import { useMemo } from "react";
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
import { ChartStatCard, ChartStatGrid } from "@/components/ui";
import { StandardChartCard } from "@/components/charts/StandardChartCard";
import { useDexScreenerStats } from "@/hooks/vibestr/useDexScreenerStats";
import { formatNumber, formatUsd } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import {
  CHART_MARGINS,
  AXIS_STYLE,
  GRID_STYLE,
  getTooltipContentStyle,
} from "@/lib/chartConfig";
import { getChartFilename } from "@/lib/chartExport";
import { CustomLabel } from "@/lib/chartHelpers";

interface PressureDataPoint {
  period: string;
  buys: number;
  sells: number;
  net: number;
  volume: number;
}

export function BuySellPressureChart() {
  const { data: pair, isLoading, error, refetch } = useDexScreenerStats();

  const chartData = useMemo<PressureDataPoint[]>(() => {
    if (!pair) return [];

    return [
      {
        period: "5m",
        buys: pair.txns.m5.buys,
        sells: -pair.txns.m5.sells,
        net: pair.txns.m5.buys - pair.txns.m5.sells,
        volume: pair.volume.m5,
      },
      {
        period: "1h",
        buys: pair.txns.h1.buys,
        sells: -pair.txns.h1.sells,
        net: pair.txns.h1.buys - pair.txns.h1.sells,
        volume: pair.volume.h1,
      },
      {
        period: "6h",
        buys: pair.txns.h6.buys,
        sells: -pair.txns.h6.sells,
        net: pair.txns.h6.buys - pair.txns.h6.sells,
        volume: pair.volume.h6,
      },
      {
        period: "24h",
        buys: pair.txns.h24.buys,
        sells: -pair.txns.h24.sells,
        net: pair.txns.h24.buys - pair.txns.h24.sells,
        volume: pair.volume.h24,
      },
    ];
  }, [pair]);

  const totalBuys24h = pair?.txns.h24.buys || 0;
  const totalSells24h = pair?.txns.h24.sells || 0;
  const buyRatio = totalBuys24h + totalSells24h > 0
    ? (totalBuys24h / (totalBuys24h + totalSells24h)) * 100
    : 50;

  const exportConfig = useMemo(
    () => ({
      filename: getChartFilename("vibestr-pressure"),
      title: "Buy/Sell Pressure",
    }),
    []
  );

  const legendItems = [
    { key: "buys", label: "Buys", color: CHART_COLORS.success, active: true },
    { key: "sells", label: "Sells", color: CHART_COLORS.danger, active: true },
  ];

  return (
    <StandardChartCard
      title="Buy/Sell Pressure"
      description="Transaction counts across time intervals"
      legend={legendItems}
      exportConfig={exportConfig}
      isLoading={isLoading}
      error={error}
      onRetry={refetch}
      isEmpty={!pair}
      emptyMessage="No trading data available"
      stats={
        <ChartStatGrid columns={3}>
          <ChartStatCard label="24h Buys" value={formatNumber(totalBuys24h)} />
          <ChartStatCard label="24h Sells" value={formatNumber(totalSells24h)} />
          <ChartStatCard
            label="Buy Ratio"
            value={`${buyRatio.toFixed(0)}%`}
            change={buyRatio > 50 ? 1 : buyRatio < 50 ? -1 : 0}
          />
        </ChartStatGrid>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={CHART_MARGINS.default} stackOffset="sign">
          <CartesianGrid strokeDasharray={GRID_STYLE.strokeDasharray} stroke={GRID_STYLE.stroke} vertical={GRID_STYLE.vertical} />
          <XAxis
            dataKey="period"
            stroke={AXIS_STYLE.stroke}
            fontSize={AXIS_STYLE.fontSize}
            fontFamily={AXIS_STYLE.fontFamily}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
          />
          <YAxis
            stroke={AXIS_STYLE.stroke}
            fontSize={AXIS_STYLE.fontSize}
            fontFamily={AXIS_STYLE.fontFamily}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            width={45}
            tickFormatter={(v) => Math.abs(v).toString()}
          />
          <Tooltip
            contentStyle={getTooltipContentStyle()}
            labelStyle={{ color: "#ffffff" }}
            formatter={(value, name) => {
              const absVal = Math.abs(Number(value));
              return [formatNumber(absVal), name === "buys" ? "Buys" : "Sells"];
            }}
          />
          <Bar
            dataKey="buys"
            stackId="pressure"
            radius={[4, 4, 0, 0]}
            label={(props: any) => (
              <CustomLabel
                {...props}
                color={CHART_COLORS.success}
                formatter={(value: number) => formatNumber(value)}
              />
            )}
          >
            {chartData.map((_, index) => (
              <Cell key={`buy-${index}`} fill={CHART_COLORS.success} />
            ))}
          </Bar>
          <Bar
            dataKey="sells"
            stackId="pressure"
            radius={[0, 0, 4, 4]}
            label={(props: any) => {
              const { x = 0, y = 0, width: barWidth, height: barHeight = 0, value = 0 } = props;
              if (value === null || value === undefined || value === 0) return null;
              const absVal = Math.abs(value);
              const formattedValue = formatNumber(absVal);
              const textWidth = formattedValue.length * 6.5;
              const padding = 6;
              const rectWidth = textWidth + padding * 2;
              const rectHeight = 20;
              const centerX = barWidth !== undefined ? x + barWidth / 2 : x;
              // For negative bars, position label inside the bar near the top
              // or just below the zero line if bar is short
              const absBarHeight = Math.abs(barHeight);
              const labelY = absBarHeight > 30 ? y + 6 : y + absBarHeight + 4;
              return (
                <g>
                  <rect
                    x={centerX - rectWidth / 2}
                    y={labelY}
                    width={rectWidth}
                    height={rectHeight}
                    fill="#050505"
                    stroke={`${CHART_COLORS.danger}4D`}
                    strokeWidth="1"
                    rx="4"
                  />
                  <text
                    x={centerX}
                    y={labelY + 10}
                    fill={CHART_COLORS.danger}
                    fontSize="11"
                    fontFamily="Mundial, system-ui, sans-serif"
                    fontWeight="600"
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {formattedValue}
                  </text>
                </g>
              );
            }}
          >
            {chartData.map((_, index) => (
              <Cell key={`sell-${index}`} fill={CHART_COLORS.danger} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </StandardChartCard>
  );
}
