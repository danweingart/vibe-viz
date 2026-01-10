"use client";

import { useRef, useMemo } from "react";
import { getChartFilename } from "@/lib/chartExport/index";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import Link from "next/link";
import { Card, CardHeader, CardDescription } from "@/components/ui";
import { ChartExportButtons } from "./ChartExportButtons";
import { useCollectionStats } from "@/hooks";
import { formatNumber } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";

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

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <Link href="/charts/holder-distribution" className="text-lg font-bold text-foreground font-brice hover:text-brand transition-colors">
            Holder Distribution
          </Link>
          <p className="export-branding text-sm text-brand font-mundial">Good Vibes Club</p>
          <CardDescription>
            Count of wallets by how many NFTs they hold
            <span className="ml-1 px-1.5 py-0.5 text-[9px] bg-chart-accent/20 text-chart-accent rounded">Estimated</span>
          </CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex gap-3 text-right text-xs">
            <div>
              <p className="font-bold text-foreground">{formatNumber(totalHolders)}</p>
              <p className="text-[10px] text-foreground-muted">Holders</p>
            </div>
            <div>
              <p className="font-bold text-chart-accent">{whalePercentage.toFixed(1)}%</p>
              <p className="text-[10px] text-foreground-muted">Whales</p>
            </div>
          </div>
          <ChartExportButtons chartRef={chartRef} config={exportConfig} />
        </div>
      </CardHeader>

      <div ref={chartRef} className="px-1 pt-1 bg-background-secondary rounded-lg chart-container flex-1 flex flex-col">
        <div className="flex-1 min-h-[120px] sm:min-h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 8, left: 35, bottom: 5 }}>
              <XAxis type="number" stroke="#71717a" fontSize={11} axisLine={false} tickLine={false} fontFamily="var(--font-mundial)" />
              <YAxis type="category" dataKey="label" stroke="#71717a" fontSize={11} axisLine={false} tickLine={false} width={45} fontFamily="var(--font-mundial)" />
              <Tooltip
                contentStyle={{ backgroundColor: "#141414", border: "1px solid #27272a", borderRadius: "8px" }}
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

        <div className="grid grid-cols-3 gap-1 sm:gap-2 mt-2 text-[10px] sm:text-xs text-center">
          <div className="p-2 rounded bg-background-tertiary">
            <p className="font-bold text-foreground">{chartData[0]?.percentage}%</p>
            <p className="text-foreground-muted">Single NFT</p>
          </div>
          <div className="p-2 rounded bg-background-tertiary">
            <p className="font-bold text-foreground">{(chartData[1]?.percentage || 0) + (chartData[2]?.percentage || 0)}%</p>
            <p className="text-foreground-muted">Collectors (2-10)</p>
          </div>
          <div className="p-2 rounded bg-background-tertiary">
            <p className="font-bold text-chart-accent">{whalePercentage.toFixed(1)}%</p>
            <p className="text-foreground-muted">Whales (11+)</p>
          </div>
        </div>

      </div>
    </Card>
  );
}
