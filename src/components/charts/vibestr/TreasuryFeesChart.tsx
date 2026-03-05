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
import { useTokenStats } from "@/hooks/vibestr/useTokenStats";
import { formatUsd, formatNumber } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import {
  CHART_MARGINS,
  AXIS_STYLE,
  GRID_STYLE,
  getTooltipContentStyle,
} from "@/lib/chartConfig";
import { getChartFilename } from "@/lib/chartExport";

interface FeeBreakdown {
  label: string;
  value: number;
  color: string;
  description: string;
}

export function TreasuryFeesChart() {
  const { data: pair, isLoading: dexLoading, error: dexError } = useDexScreenerStats();
  const { data: stats, isLoading: statsLoading, error: statsError, refetch } = useTokenStats();

  const isLoading = dexLoading || statsLoading;
  const error = dexError || statsError;

  const chartData = useMemo<FeeBreakdown[]>(() => {
    if (!pair) return [];

    const volume24h = pair.volume.h24;
    const totalFees = volume24h * 0.10; // 10% swap fee
    const treasuryFees = totalFees * 0.80; // 80% of fees → treasury (8% of volume)
    const lpFees = totalFees * 0.20; // 20% of fees → LP (2% of volume)

    return [
      {
        label: "24h Volume",
        value: volume24h,
        color: CHART_COLORS.primary,
        description: "Total trading volume",
      },
      {
        label: "Total Fees (10%)",
        value: totalFees,
        color: CHART_COLORS.accent,
        description: "10% swap fee on all trades",
      },
      {
        label: "Treasury (8%)",
        value: treasuryFees,
        color: CHART_COLORS.success,
        description: "Used to buy floor NFTs",
      },
      {
        label: "LP Rewards (2%)",
        value: lpFees,
        color: CHART_COLORS.info,
        description: "Distributed to LPs",
      },
    ];
  }, [pair]);

  const volume24h = pair?.volume.h24 || 0;
  const dailyFees = volume24h * 0.10;
  const dailyTreasury = dailyFees * 0.80;
  const burnedAmount = stats?.burnedAmount || 0;
  const burnedPercent = stats?.burnedPercent || 0;

  const exportConfig = useMemo(
    () => ({
      filename: getChartFilename("vibestr-treasury"),
      title: "Treasury & Fee Breakdown",
    }),
    []
  );

  return (
    <StandardChartCard
      title="Flywheel Mechanics"
      description="Fee distribution and token burn cycle"
      exportConfig={exportConfig}
      isLoading={isLoading}
      error={error}
      onRetry={refetch}
      isEmpty={chartData.length === 0}
      emptyMessage="No fee data available"
      infoContent={
        <div className="space-y-1">
          <div className="font-medium text-gvc-text">How the VIBESTR Flywheel Works:</div>
          <div>1. Every swap incurs a <span className="text-brand font-medium">10% fee</span></div>
          <div>2. <span className="text-gvc-green font-medium">8%</span> goes to treasury → buys floor-priced GVC NFTs</div>
          <div>3. NFTs are relisted at <span className="text-brand font-medium">1.2× purchase price</span></div>
          <div>4. When sold, proceeds are used to <span className="text-gvc-red font-medium">burn VIBESTR tokens</span></div>
          <div>5. 2% goes to liquidity providers as rewards</div>
        </div>
      }
      stats={
        <ChartStatGrid columns={4}>
          <ChartStatCard label="24h Volume" value={formatUsd(volume24h, 0)} />
          <ChartStatCard label="Daily Fees" value={formatUsd(dailyFees, 0)} />
          <ChartStatCard label="To Treasury" value={formatUsd(dailyTreasury, 0)} />
          <ChartStatCard
            label="Burned"
            value={`${formatNumber(burnedAmount / 1e6)}M`}
            change={burnedPercent > 0 ? 1 : 0}
          />
        </ChartStatGrid>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={CHART_MARGINS.default} layout="vertical">
          <CartesianGrid strokeDasharray={GRID_STYLE.strokeDasharray} stroke={GRID_STYLE.stroke} horizontal={GRID_STYLE.vertical} vertical />
          <XAxis
            type="number"
            stroke={AXIS_STYLE.stroke}
            fontSize={AXIS_STYLE.fontSize}
            fontFamily={AXIS_STYLE.fontFamily}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            tickFormatter={(v) => {
              if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
              if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
              return `$${v.toFixed(0)}`;
            }}
          />
          <YAxis
            type="category"
            dataKey="label"
            stroke={AXIS_STYLE.stroke}
            fontSize={AXIS_STYLE.fontSize}
            fontFamily={AXIS_STYLE.fontFamily}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            width={100}
          />
          <Tooltip
            contentStyle={getTooltipContentStyle()}
            labelStyle={{ color: "#ffffff" }}
            formatter={(value, _, entry) => [
              formatUsd(Number(value), 0),
              (entry as { payload: FeeBreakdown }).payload.description,
            ]}
          />
          <Bar
            dataKey="value"
            radius={[0, 8, 8, 0]}
            label={(props: any) => {
              const { x = 0, y = 0, width: barWidth = 0, height: barHeight = 0, value = 0, index: idx = 0 } = props;
              if (value === null || value === undefined || value === 0) return null;
              const entry = chartData[idx];
              const color = entry?.color || CHART_COLORS.primary;
              let formattedValue: string;
              if (value >= 1_000_000) formattedValue = `$${(value / 1_000_000).toFixed(1)}M`;
              else if (value >= 1_000) formattedValue = `$${(value / 1_000).toFixed(0)}K`;
              else formattedValue = `$${value.toFixed(0)}`;
              const textWidth = formattedValue.length * 6.5;
              const padding = 6;
              const rectWidth = textWidth + padding * 2;
              const rectHeight = 20;
              const labelX = x + barWidth + 8;
              const centerY = y + barHeight / 2;
              return (
                <g>
                  <rect
                    x={labelX}
                    y={centerY - rectHeight / 2}
                    width={rectWidth}
                    height={rectHeight}
                    fill="#050505"
                    stroke={`${color}4D`}
                    strokeWidth="1"
                    rx="4"
                  />
                  <text
                    x={labelX + rectWidth / 2}
                    y={centerY}
                    fill={color}
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
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </StandardChartCard>
  );
}
