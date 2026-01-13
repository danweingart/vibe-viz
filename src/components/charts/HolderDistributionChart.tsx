"use client";

import { useMemo, useCallback } from "react";
import { getChartFilename } from "@/lib/chartExport/index";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";
import { ChartStatCard, ChartStatGrid } from "@/components/ui";
import { StandardChartCard, LegendItem } from "@/components/charts/StandardChartCard";
import { useCollectionStats } from "@/hooks";
import { formatNumber } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import { CHART_MARGINS, AXIS_STYLE, GRID_STYLE, getTooltipContentStyle, EXPORT_MARGINS, EXPORT_AXIS_STYLE, getYAxisWidth, getExportYAxisWidth } from "@/lib/chartConfig";

// Simulated holder distribution based on common NFT patterns
// In production, this would come from on-chain data or an indexer
const HOLDER_BUCKETS = [
  { label: "1 GVC", min: 1, max: 1, percentage: 65 },
  { label: "2-5", min: 2, max: 5, percentage: 22 },
  { label: "6-10", min: 6, max: 10, percentage: 8 },
  { label: "11-25", min: 11, max: 25, percentage: 3.5 },
  { label: "26-50", min: 26, max: 50, percentage: 1 },
  { label: "50+", min: 51, max: 999, percentage: 0.5 },
];

export function HolderDistributionChart() {
  const { data: stats } = useCollectionStats();

  const totalHolders = stats?.numOwners || 0;

  const chartData = HOLDER_BUCKETS.map((bucket, index) => ({
    ...bucket,
    count: Math.round((bucket.percentage / 100) * totalHolders),
    color: index === 0 ? CHART_COLORS.primary : index < 3 ? CHART_COLORS.info : CHART_COLORS.accent,
  }));

  // Calculate whale concentration (top holders)
  const whaleHolders = chartData.slice(3).reduce((sum, b) => sum + b.count, 0);
  const whalePercentage = totalHolders > 0 ? (whaleHolders / totalHolders) * 100 : 0;

  // Legend items
  const legendItems: LegendItem[] = [
    { key: "holders", label: "Wallet Count", color: CHART_COLORS.primary },
  ];

  // Export configuration
  const exportConfig = useMemo(() => ({
    title: "Holder Distribution",
    subtitle: `${formatNumber(totalHolders)} unique wallets by collection size`,
    filename: getChartFilename("holder-distribution"),
    legend: [
      { color: CHART_COLORS.primary, label: "Wallet Count", value: "Holders" },
    ],
    statCards: [
      { label: "Total Holders", value: formatNumber(totalHolders) },
      { label: "Single NFT", value: `${chartData[0]?.percentage || 0}%` },
      { label: "Whales (11+)", value: `${whalePercentage.toFixed(1)}%` },
    ],
  }), [totalHolders, chartData, whalePercentage]);

  const renderChart = useCallback((width: number, height: number) => (
    <BarChart data={chartData} layout="vertical" width={width} height={height} margin={EXPORT_MARGINS.horizontal}>
      <CartesianGrid strokeDasharray={GRID_STYLE.strokeDasharray} stroke={GRID_STYLE.stroke} vertical={GRID_STYLE.vertical} />
      <XAxis type="number" stroke={EXPORT_AXIS_STYLE.stroke} fontSize={EXPORT_AXIS_STYLE.fontSize} axisLine={EXPORT_AXIS_STYLE.axisLine} tickLine={EXPORT_AXIS_STYLE.tickLine} fontFamily={EXPORT_AXIS_STYLE.fontFamily} />
      <YAxis type="category" dataKey="label" stroke={EXPORT_AXIS_STYLE.stroke} fontSize={EXPORT_AXIS_STYLE.fontSize} axisLine={EXPORT_AXIS_STYLE.axisLine} tickLine={EXPORT_AXIS_STYLE.tickLine} width={getExportYAxisWidth('horizontal')} fontFamily={EXPORT_AXIS_STYLE.fontFamily} />
      <Tooltip
        contentStyle={getTooltipContentStyle()}
        content={({ active, payload }) => {
          if (!active || !payload?.length) return null;
          const d = payload[0]?.payload;
          return (
            <div className="bg-background-secondary border border-border rounded-lg p-2 text-xs">
              <p className="font-bold text-brand">{d.label} NFTs</p>
              <p className="text-foreground">{formatNumber(d.count)} holders ({d.percentage}%)</p>
            </div>
          );
        }}
      />
      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
        {chartData.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.color} />
        ))}
      </Bar>
    </BarChart>
  ), [chartData]);

  return (
    <StandardChartCard
      title="Holder Distribution"
      href="/charts/holder-distribution"
      description="Wallet distribution by collection size"
      badge={<span className="px-1.5 py-0.5 text-[9px] bg-chart-accent/20 text-chart-accent rounded">Estimated</span>}
      legend={legendItems}
      exportConfig={exportConfig}
      renderChart={renderChart}
      isEmpty={totalHolders === 0}
      emptyMessage="No holder data available"
      stats={
        <ChartStatGrid columns={3}>
          <ChartStatCard
            label="Total Holders"
            value={formatNumber(totalHolders)}
          />
          <ChartStatCard
            label="Single NFT"
            value={`${chartData[0]?.percentage || 0}%`}
          />
          <ChartStatCard
            label="Whales (11+)"
            value={`${whalePercentage.toFixed(1)}%`}
          />
        </ChartStatGrid>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={CHART_MARGINS.horizontal}>
          <CartesianGrid strokeDasharray={GRID_STYLE.strokeDasharray} stroke={GRID_STYLE.stroke} vertical={GRID_STYLE.vertical} />
          <XAxis type="number" stroke={AXIS_STYLE.stroke} fontSize={AXIS_STYLE.fontSize} axisLine={AXIS_STYLE.axisLine} tickLine={AXIS_STYLE.tickLine} fontFamily={AXIS_STYLE.fontFamily} />
          <YAxis type="category" dataKey="label" stroke={AXIS_STYLE.stroke} fontSize={AXIS_STYLE.fontSize} axisLine={AXIS_STYLE.axisLine} tickLine={AXIS_STYLE.tickLine} width={getYAxisWidth('horizontal')} fontFamily={AXIS_STYLE.fontFamily} />
          <Tooltip
            contentStyle={getTooltipContentStyle()}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0]?.payload;
              return (
                <div className="bg-background-secondary border border-border rounded-lg p-2 text-xs">
                  <p className="font-bold text-brand">{d.label} NFTs</p>
                  <p className="text-foreground">{formatNumber(d.count)} holders ({d.percentage}%)</p>
                </div>
              );
            }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </StandardChartCard>
  );
}
