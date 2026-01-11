"use client";

import { useRef, useMemo } from "react";
import { getChartFilename } from "@/lib/chartExport/index";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardDescription, ChartLegendToggle, ChartStatCard, ChartStatGrid } from "@/components/ui";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { ChartExportButtons } from "./ChartExportButtons";
import { useMarketDepth } from "@/hooks/useMarketDepth";
import { CHART_COLORS } from "@/lib/constants";
import { CHART_MARGINS, AXIS_STYLE, CHART_HEIGHT, getTooltipContentStyle } from "@/lib/chartConfig";

export function MarketDepthChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, error } = useMarketDepth();

  const exportConfig = useMemo(() => ({
    title: "Market Depth",
    subtitle: "Order book depth by price level (bids & asks)",
    legend: [
      { color: CHART_COLORS.success, label: "Bids (Offers)", value: "Buy orders" },
      { color: CHART_COLORS.danger, label: "Asks (Listings)", value: "Sell orders" },
    ],
    filename: getChartFilename("market-depth", 0),
  }), []);

  const legendItems = [
    { key: "bids", label: "Bids", color: CHART_COLORS.success },
    { key: "asks", label: "Asks", color: CHART_COLORS.danger },
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

  if (isLoading) return <ChartSkeleton />;
  if (error || !data) {
    return (
      <Card>
        <CardHeader><span className="text-lg font-bold font-brice">Market Depth</span></CardHeader>
        <p className="text-foreground-muted text-center py-8">No market depth data available</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <span className="text-lg font-bold text-foreground font-brice">Market Depth</span>
          <CardDescription>Order book depth by price level</CardDescription>
        </div>
        <ChartExportButtons chartRef={chartRef} config={exportConfig} />
      </CardHeader>

      <div className="flex items-center px-3 mb-3">
        <ChartLegendToggle items={legendItems} />
      </div>

      <div ref={chartRef} className="p-3 bg-background-secondary rounded-lg chart-container flex-1 flex flex-col">
        <div className="flex-1 min-h-[320px] sm:min-h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={CHART_MARGINS.default}>
              <XAxis type="category" dataKey="label" stroke={AXIS_STYLE.stroke} fontSize={AXIS_STYLE.fontSize} axisLine={AXIS_STYLE.axisLine} tickLine={AXIS_STYLE.tickLine} fontFamily={AXIS_STYLE.fontFamily} />
              <YAxis type="number" stroke={AXIS_STYLE.stroke} fontSize={AXIS_STYLE.fontSize} axisLine={AXIS_STYLE.axisLine} tickLine={AXIS_STYLE.tickLine} width={30} fontFamily={AXIS_STYLE.fontFamily} />
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
              <Bar dataKey="bids" stackId="depth" fill={CHART_COLORS.success} radius={[4, 4, 4, 4]} />
              <Bar dataKey="asks" stackId="depth" fill={CHART_COLORS.danger} radius={[4, 4, 4, 4]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>

      <ChartStatGrid columns={2}>
        <ChartStatCard
          label="Total Bids"
          value={totalBids.toString()}
        />
        <ChartStatCard
          label="Total Listings"
          value={totalAsks.toString()}
        />
      </ChartStatGrid>
    </Card>
  );
}
