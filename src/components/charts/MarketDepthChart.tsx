"use client";

import { useMemo, useState, useCallback } from "react";
import { getChartFilename } from "@/lib/chartExport/index";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartStatCard, ChartStatGrid } from "@/components/ui";
import { StandardChartCard, LegendItem } from "@/components/charts/StandardChartCard";
import { useMarketDepth } from "@/hooks/useMarketDepth";
import { CHART_COLORS } from "@/lib/constants";
import { CHART_MARGINS, AXIS_STYLE, getTooltipContentStyle, getYAxisWidth, getAlignedTicks } from "@/lib/chartConfig";
import { CustomLabel } from "@/lib/chartHelpers";

export function MarketDepthChart() {
  const { data, isLoading, error } = useMarketDepth();
  const [visibleSeries, setVisibleSeries] = useState<Set<string>>(
    new Set(["bids", "asks"])
  );

  const handleLegendToggle = useCallback((key: string) => {
    setVisibleSeries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const legendItems: LegendItem[] = [
    { key: "bids", label: "Bids", color: CHART_COLORS.success, active: visibleSeries.has("bids") },
    { key: "asks", label: "Asks", color: CHART_COLORS.danger, active: visibleSeries.has("asks") },
  ];

  const chartData = useMemo(() => {
    if (!data) return [];

    // Combine offers and listings into unified price levels
    // Focus on relevant price range (near floor)
    const floorPrice = data.lowestListing || 1;
    const minPrice = Math.max(0.01, floorPrice * 0.5);
    const maxPrice = floorPrice * 1.5;

    // Create price buckets at 0.02 ETH intervals for cleaner visualization
    const bucketSize = 0.02;
    const buckets = new Map<number, { bids: number; asks: number }>();

    // Initialize buckets starting from a round number
    const startBucket = Math.floor(minPrice / bucketSize) * bucketSize;
    for (let p = startBucket; p <= maxPrice; p += bucketSize) {
      const bucket = Math.round(p * 100) / 100;
      buckets.set(bucket, { bids: 0, asks: 0 });
    }

    // Helper to find the right bucket for a price
    const getBucket = (price: number) => Math.round(Math.floor(price / bucketSize) * bucketSize * 100) / 100;

    // Aggregate offers (bids) into buckets
    for (const offer of data.offers) {
      if (offer.price >= minPrice && offer.price <= maxPrice) {
        const bucket = getBucket(offer.price);
        if (buckets.has(bucket)) {
          const current = buckets.get(bucket)!;
          current.bids += offer.depth;
        }
      }
    }

    // Aggregate listings (asks) into buckets
    for (const listing of data.listings) {
      if (listing.price >= minPrice && listing.price <= maxPrice) {
        const bucket = getBucket(listing.price);
        if (buckets.has(bucket)) {
          const current = buckets.get(bucket)!;
          current.asks += listing.depth;
        }
      }
    }

    // Convert to array and filter out empty buckets
    // Use string label for proper categorical centering
    return Array.from(buckets.entries())
      .map(([price, { bids, asks }]) => ({
        price,
        label: price.toFixed(2),
        bids: bids > 0 ? bids : null,
        asks: asks > 0 ? asks : null,
      }))
      .filter(d => d.bids || d.asks)
      .sort((a, b) => a.price - b.price);
  }, [data]);


  const totalBids = chartData.reduce((sum, d) => sum + (d.bids || 0), 0);
  const totalAsks = chartData.reduce((sum, d) => sum + (d.asks || 0), 0);

  const exportConfig = useMemo(() => ({
    title: "Market Depth",
    filename: getChartFilename("market-depth", 0),
  }), []);

  return (
    <StandardChartCard
      title="Market Depth"
      description="Order book depth by price level"
      legend={legendItems}
      onLegendToggle={handleLegendToggle}
      exportConfig={exportConfig}
      isLoading={isLoading}
      error={error}
      isEmpty={!data || chartData.length === 0}
      emptyMessage="No market depth data available"
      stats={
        <ChartStatGrid columns={2}>
          <ChartStatCard
            label="Total Bids"
            value={<span style={{ color: CHART_COLORS.success }}>{totalBids.toString()}</span>}
          />
          <ChartStatCard
            label="Total Listings"
            value={<span style={{ color: CHART_COLORS.danger }}>{totalAsks.toString()}</span>}
          />
        </ChartStatGrid>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={CHART_MARGINS.default}>
          <XAxis type="category" dataKey="label" stroke={AXIS_STYLE.stroke} fontSize={AXIS_STYLE.fontSize} axisLine={AXIS_STYLE.axisLine} tickLine={AXIS_STYLE.tickLine} fontFamily={AXIS_STYLE.fontFamily} />
          <YAxis type="number" stroke={AXIS_STYLE.stroke} fontSize={AXIS_STYLE.fontSize} axisLine={AXIS_STYLE.axisLine} tickLine={AXIS_STYLE.tickLine} width={getYAxisWidth()} fontFamily={AXIS_STYLE.fontFamily} />
          <Tooltip
            contentStyle={getTooltipContentStyle()}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0]?.payload;
              return (
                <div className="bg-background-secondary border border-border rounded-lg p-2 text-xs">
                  <p className="font-bold text-foreground">{d.price.toFixed(2)} ETH</p>
                  {d.bids && (
                    <p style={{ color: CHART_COLORS.success }}>
                      {d.bids} bid{d.bids > 1 ? "s" : ""}
                    </p>
                  )}
                  {d.asks && (
                    <p style={{ color: CHART_COLORS.danger }}>
                      {d.asks} listing{d.asks > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              );
            }}
          />
          {visibleSeries.has("asks") && (
            <Bar
              dataKey="asks"
              stackId="depth"
              fill={CHART_COLORS.danger}
              radius={[4, 4, 4, 4]}
              label={(props: any) => {
                const { x, y, width, value } = props;
                if (!value || value === 0) return null;

                const centerX = x + width / 2;
                const labelY = y - 8;
                const formattedValue = value.toFixed(0);
                const textWidth = formattedValue.length * 6.5;
                const padding = 6;
                const rectWidth = textWidth + padding * 2;
                const rectHeight = 20;

                return (
                  <g>
                    <rect
                      x={centerX - rectWidth / 2}
                      y={labelY - rectHeight}
                      width={rectWidth}
                      height={rectHeight}
                      fill="#050505"
                      stroke="rgba(255, 255, 255, 0.3)"
                      strokeWidth="1"
                      rx="4"
                    />
                    <text
                      x={centerX}
                      y={labelY - 6}
                      fill="#ffffff"
                      fontSize="11"
                      fontFamily="Mundial, sans-serif"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {formattedValue}
                    </text>
                  </g>
                );
              }}
            />
          )}
          {visibleSeries.has("bids") && (
            <Bar
              dataKey="bids"
              stackId="depth"
              fill={CHART_COLORS.success}
              radius={[4, 4, 4, 4]}
              label={(props: any) => {
                const { x, y, width, value } = props;
                if (!value || value === 0) return null;

                const centerX = x + width / 2;
                const labelY = y - 8;
                const formattedValue = value.toFixed(0);
                const textWidth = formattedValue.length * 6.5;
                const padding = 6;
                const rectWidth = textWidth + padding * 2;
                const rectHeight = 20;

                return (
                  <g>
                    <rect
                      x={centerX - rectWidth / 2}
                      y={labelY - rectHeight}
                      width={rectWidth}
                      height={rectHeight}
                      fill="#050505"
                      stroke="rgba(255, 255, 255, 0.3)"
                      strokeWidth="1"
                      rx="4"
                    />
                    <text
                      x={centerX}
                      y={labelY - 6}
                      fill="#ffffff"
                      fontSize="11"
                      fontFamily="Mundial, sans-serif"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {formattedValue}
                    </text>
                  </g>
                );
              }}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </StandardChartCard>
  );
}
