"use client";

import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { ChartStatCard, ChartStatGrid } from "@/components/ui";
import { StandardChartCard } from "@/components/charts/StandardChartCard";
import { useNFTHoldings } from "@/hooks/vibestr";
import { formatNumber } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import { getTooltipContentStyle } from "@/lib/chartConfig";
import { getChartFilename } from "@/lib/chartExport";

export function HoldingsBreakdownChart() {
  const { data: holdings, isLoading, error } = useNFTHoldings();

  // Calculate breakdown
  const chartData = useMemo(() => {
    if (!holdings || holdings.length === 0) return [];

    const listed = holdings.filter((h) => h.listingPrice).length;
    const withOffers = holdings.filter((h) => h.bestOffer && !h.listingPrice).length;
    const unlisted = holdings.length - listed - withOffers;

    return [
      { name: "Listed", value: listed, color: CHART_COLORS.primary },
      { name: "With Offers", value: withOffers, color: CHART_COLORS.info },
      { name: "Unlisted", value: unlisted, color: CHART_COLORS.muted },
    ].filter((item) => item.value > 0); // Only show categories with values
  }, [holdings]);

  // Calculate stats
  const totalHoldings = holdings?.length || 0;
  const listedCount = chartData.find((d) => d.name === "Listed")?.value || 0;
  const listedPercent = totalHoldings > 0 ? (listedCount / totalHoldings) * 100 : 0;

  // Export configuration
  const exportConfig = useMemo(
    () => ({
      filename: getChartFilename("holdings-breakdown"),
      title: "NFT Holdings Breakdown",
    }),
    []
  );

  return (
    <StandardChartCard
      title="NFT Holdings Breakdown"
      description="Distribution of Good Vibes Club NFTs by status"
      exportConfig={exportConfig}
      isLoading={isLoading}
      error={error}
      isEmpty={!holdings || holdings.length === 0}
      emptyMessage="No holdings data available"
      stats={
        <ChartStatGrid columns={3}>
          <ChartStatCard label="Total NFTs" value={formatNumber(totalHoldings)} />
          <ChartStatCard label="Listed" value={formatNumber(listedCount)} />
          <ChartStatCard
            label="Listed %"
            value={`${listedPercent.toFixed(1)}%`}
          />
        </ChartStatGrid>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius="50%"
            outerRadius="70%"
            paddingAngle={2}
            dataKey="value"
            label={(entry) => `${entry.name}: ${entry.value}`}
            labelLine={false}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={getTooltipContentStyle()}
            labelStyle={{ color: "#ffffff" }}
            formatter={(value, name) => [formatNumber(Number(value)), name]}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            formatter={(value) => (
              <span style={{ color: "#a1a1aa", fontSize: "13px" }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </StandardChartCard>
  );
}
