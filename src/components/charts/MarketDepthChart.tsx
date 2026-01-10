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
import { Card, CardHeader, CardDescription } from "@/components/ui";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { ChartExportButtons } from "./ChartExportButtons";
import { useMarketDepth } from "@/hooks/useMarketDepth";
import { CHART_COLORS } from "@/lib/constants";

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

  const chartData = useMemo(() => {
    if (!data) return [];

    // Combine offers and listings into unified price levels
    // Focus on relevant price range (near floor)
    const floorPrice = data.lowestListing || 1;
    const minPrice = Math.max(0.01, floorPrice * 0.5);
    const maxPrice = floorPrice * 1.5;

    // Create price buckets at 0.03 ETH intervals for cleaner visualization
    const bucketSize = 0.03;
    const buckets = new Map<number, { bids: number; asks: number }>();

    // Initialize buckets
    for (let p = minPrice; p <= maxPrice; p += bucketSize) {
      const bucket = Math.round(p * 100) / 100;
      buckets.set(bucket, { bids: 0, asks: 0 });
    }

    // Aggregate offers (bids) into buckets
    for (const offer of data.offers) {
      if (offer.price >= minPrice && offer.price <= maxPrice) {
        const bucket = Math.round(Math.floor(offer.price / bucketSize) * bucketSize * 100) / 100;
        if (buckets.has(bucket)) {
          const current = buckets.get(bucket)!;
          current.bids += offer.depth;
        }
      }
    }

    // Aggregate listings (asks) into buckets
    for (const listing of data.listings) {
      if (listing.price >= minPrice && listing.price <= maxPrice) {
        const bucket = Math.round(Math.floor(listing.price / bucketSize) * bucketSize * 100) / 100;
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
          <p className="export-branding text-sm text-brand font-mundial">Good Vibes Club</p>
          <CardDescription>Order book depth by price level</CardDescription>
        </div>
        <ChartExportButtons chartRef={chartRef} config={exportConfig} />
      </CardHeader>

      <div ref={chartRef} className="px-1 pt-1 bg-background-secondary rounded-lg chart-container flex-1 flex flex-col">
        <div className="flex-1 min-h-[120px] sm:min-h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 8, left: 5, bottom: 0 }}>
              <XAxis type="category" dataKey="label" stroke="#71717a" fontSize={10} axisLine={false} tickLine={false} fontFamily="var(--font-mundial)" />
              <YAxis type="number" stroke="#71717a" fontSize={11} axisLine={false} tickLine={false} width={30} fontFamily="var(--font-mundial)" />
              <Tooltip
                contentStyle={{ backgroundColor: "#141414", border: "1px solid #27272a", borderRadius: "8px" }}
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

        {/* Legend */}
        <div className="flex justify-center gap-5 mt-1 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS.success }} />
            <span className="text-foreground-muted">Bids</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS.danger }} />
            <span className="text-foreground-muted">Asks</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
