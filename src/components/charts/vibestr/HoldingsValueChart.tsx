"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartStatCard, ChartStatGrid } from "@/components/ui";
import { StandardChartCard } from "@/components/charts/StandardChartCard";
import { useNFTHoldings } from "@/hooks/vibestr";
import { useEthPrice } from "@/hooks";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatEth, formatUsd } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import {
  CHART_MARGINS,
  AXIS_STYLE,
  GRID_STYLE,
  getTooltipContentStyle,
} from "@/lib/chartConfig";
import { getChartFilename } from "@/lib/chartExport";

export function HoldingsValueChart() {
  const { currency } = useChartSettings();
  const { data: holdings, isLoading, error } = useNFTHoldings();
  const { data: ethPrice } = useEthPrice();

  // Calculate value distribution by price range
  const chartData = useMemo(() => {
    if (!holdings || holdings.length === 0) return [];

    // Define price buckets (in ETH)
    const buckets = [
      { label: "< 0.01", min: 0, max: 0.01, count: 0, totalValue: 0 },
      { label: "0.01-0.05", min: 0.01, max: 0.05, count: 0, totalValue: 0 },
      { label: "0.05-0.1", min: 0.05, max: 0.1, count: 0, totalValue: 0 },
      { label: "0.1-0.5", min: 0.1, max: 0.5, count: 0, totalValue: 0 },
      { label: "> 0.5", min: 0.5, max: Infinity, count: 0, totalValue: 0 },
    ];

    // Count NFTs in each bucket
    holdings.forEach((nft) => {
      if (!nft.listingPrice) return;

      const price = nft.listingPrice;
      const bucket = buckets.find((b) => price >= b.min && price < b.max);

      if (bucket) {
        bucket.count++;
        bucket.totalValue += price;
      }
    });

    // Filter out empty buckets and convert to chart format
    return buckets
      .filter((b) => b.count > 0)
      .map((b) => ({
        range: b.label,
        count: b.count,
        value: b.totalValue,
        valueUsd: ethPrice ? b.totalValue * ethPrice.usd : 0,
      }));
  }, [holdings, ethPrice]);

  // Calculate total stats
  const totalListedValue =
    holdings
      ?.filter((h) => h.listingPrice)
      .reduce((sum, h) => sum + (h.listingPrice || 0), 0) || 0;

  const totalListedCount = holdings?.filter((h) => h.listingPrice).length || 0;
  const avgListingPrice = totalListedCount > 0 ? totalListedValue / totalListedCount : 0;

  // Export configuration
  const exportConfig = useMemo(
    () => ({
      filename: getChartFilename("holdings-value"),
      title: "Holdings Value Distribution",
    }),
    []
  );

  return (
    <StandardChartCard
      title="Holdings Value Distribution"
      description="Listing price distribution by price range"
      exportConfig={exportConfig}
      isLoading={isLoading}
      error={error}
      isEmpty={chartData.length === 0}
      emptyMessage="No listing data available"
      stats={
        <ChartStatGrid columns={3}>
          <ChartStatCard
            label="Total Listed Value"
            value={
              currency === "eth"
                ? formatEth(totalListedValue)
                : formatUsd(ethPrice ? totalListedValue * ethPrice.usd : 0)
            }
          />
          <ChartStatCard label="Listed NFTs" value={totalListedCount.toString()} />
          <ChartStatCard
            label="Avg Price"
            value={
              currency === "eth"
                ? formatEth(avgListingPrice)
                : formatUsd(ethPrice ? avgListingPrice * ethPrice.usd : 0)
            }
          />
        </ChartStatGrid>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={CHART_MARGINS.default}>
          <CartesianGrid
            strokeDasharray={GRID_STYLE.strokeDasharray}
            stroke={GRID_STYLE.stroke}
            vertical={GRID_STYLE.vertical}
          />
          <XAxis
            dataKey="range"
            stroke={AXIS_STYLE.stroke}
            fontSize={AXIS_STYLE.fontSize}
            fontFamily={AXIS_STYLE.fontFamily}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            label={{
              value: "Price Range (ETH)",
              position: "insideBottom",
              offset: -5,
              style: { fill: AXIS_STYLE.stroke, fontSize: 12 },
            }}
          />
          <YAxis
            stroke={AXIS_STYLE.stroke}
            fontSize={AXIS_STYLE.fontSize}
            fontFamily={AXIS_STYLE.fontFamily}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            label={{
              value: currency === "eth" ? "Total Value (ETH)" : "Total Value (USD)",
              angle: -90,
              position: "insideLeft",
              style: { fill: AXIS_STYLE.stroke, fontSize: 12 },
            }}
            tickFormatter={(value) =>
              currency === "eth" ? `${value.toFixed(2)}Ξ` : `$${value.toFixed(0)}`
            }
          />
          <Tooltip
            contentStyle={getTooltipContentStyle()}
            labelStyle={{ color: "#ffffff" }}
            formatter={(value, name) => {
              if (name === "value") {
                return [
                  currency === "eth"
                    ? formatEth(Number(value))
                    : formatUsd(Number(value)),
                  "Total Value",
                ];
              }
              return [value, name];
            }}
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;

              const data = payload[0].payload;

              return (
                <div style={getTooltipContentStyle()}>
                  <p style={{ marginBottom: 8, color: "#fafafa", fontWeight: 600 }}>
                    {label}
                  </p>
                  <p style={{ color: "#a1a1aa", fontSize: 13 }}>
                    NFTs: {data.count}
                  </p>
                  <p style={{ color: CHART_COLORS.primary, fontSize: 13 }}>
                    Value:{" "}
                    {currency === "eth"
                      ? formatEth(data.value)
                      : formatUsd(data.valueUsd)}
                  </p>
                </div>
              );
            }}
          />
          <Bar
            dataKey={currency === "eth" ? "value" : "valueUsd"}
            fill={CHART_COLORS.primary}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </StandardChartCard>
  );
}
