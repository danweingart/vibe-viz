"use client";

import { useRef, useMemo } from "react";
import { getChartFilename } from "@/lib/chartExport/index";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";
import Link from "next/link";
import { Card, CardHeader, CardDescription, ChartLegendToggle, ChartStatCard, ChartStatGrid } from "@/components/ui";
import { ChartExportButtons } from "./ChartExportButtons";
import { useCollectionStats } from "@/hooks";
import { formatNumber } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import { CHART_MARGINS, AXIS_STYLE, GRID_STYLE, CHART_HEIGHT, getTooltipContentStyle } from "@/lib/chartConfig";

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
  const chartRef = useRef<HTMLDivElement>(null);
  const { data: stats } = useCollectionStats();

  const totalHolders = stats?.numOwners || 0;

  const exportConfig = useMemo(() => ({
    title: "Holder Distribution",
    subtitle: `${formatNumber(totalHolders)} unique wallets by collection size`,
    legend: [
      { color: CHART_COLORS.primary, label: "Wallet Count", value: "Holders" },
    ],
    filename: getChartFilename("holder-distribution"),
  }), [totalHolders]);

  const chartData = HOLDER_BUCKETS.map((bucket, index) => ({
    ...bucket,
    count: Math.round((bucket.percentage / 100) * totalHolders),
    color: index === 0 ? CHART_COLORS.primary : index < 3 ? CHART_COLORS.info : CHART_COLORS.accent,
  }));

  // Calculate whale concentration (top holders)
  const whaleHolders = chartData.slice(3).reduce((sum, b) => sum + b.count, 0);
  const whalePercentage = totalHolders > 0 ? (whaleHolders / totalHolders) * 100 : 0;

  const legendItems = [
    { key: "holders", label: "Wallet Count", color: CHART_COLORS.primary },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <Link href="/charts/holder-distribution" className="text-lg font-bold text-foreground font-brice hover:text-brand transition-colors">
            Holder Distribution
          </Link>
          <span className="export-branding text-sm text-brand font-mundial">Good Vibes Club</span>
          <CardDescription>
            Count of wallets by how many NFTs they hold
            <span className="ml-1 px-1.5 py-0.5 text-[9px] bg-chart-accent/20 text-chart-accent rounded">Estimated</span>
          </CardDescription>
        </div>
        <ChartExportButtons chartRef={chartRef} config={exportConfig} />
      </CardHeader>

      <div className="flex items-center px-3 mb-3">
        <ChartLegendToggle items={legendItems} />
      </div>

      <div ref={chartRef} className="p-3 bg-background-secondary rounded-lg chart-container flex-1 flex flex-col">
        <div className="flex-1 min-h-[320px] sm:min-h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={CHART_MARGINS.horizontal}>
              <CartesianGrid strokeDasharray={GRID_STYLE.strokeDasharray} stroke={GRID_STYLE.stroke} vertical={GRID_STYLE.vertical} />
              <XAxis type="number" stroke={AXIS_STYLE.stroke} fontSize={AXIS_STYLE.fontSize} axisLine={AXIS_STYLE.axisLine} tickLine={AXIS_STYLE.tickLine} fontFamily={AXIS_STYLE.fontFamily} />
              <YAxis type="category" dataKey="label" stroke={AXIS_STYLE.stroke} fontSize={AXIS_STYLE.fontSize} axisLine={AXIS_STYLE.axisLine} tickLine={AXIS_STYLE.tickLine} width={45} fontFamily={AXIS_STYLE.fontFamily} />
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
        </div>
      </div>

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
    </Card>
  );
}
