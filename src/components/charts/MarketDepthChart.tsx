"use client";

import { useRef, useMemo } from "react";
import { getChartFilename } from "@/lib/chartExport/index";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Link from "next/link";
import { Card, CardHeader, CardDescription } from "@/components/ui";
import { ChartExportButtons } from "./ChartExportButtons";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { useMarketDepth } from "@/hooks";
import { formatEth, formatNumber } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";

export function MarketDepthChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, error } = useMarketDepth();

  const exportConfig = useMemo(() => ({
    title: "Market Depth",
    subtitle: "Cumulative bids vs asks by price level (ETH)",
    legend: [
      { color: CHART_COLORS.success, label: "Bids", value: "Buy Orders" },
      { color: CHART_COLORS.danger, label: "Asks", value: "Listings" },
    ],
    filename: getChartFilename("market-depth"),
  }), []);

  // Transform data into depth chart format with 0.03 ETH steps
  const { depthData, highestBid, lowestAsk, maxDepth } = useMemo(() => {
    if (!data) return { depthData: [], highestBid: 0, lowestAsk: 0, maxDepth: 0 };

    const STEP_SIZE = 0.03; // 0.03 ETH steps
    const floorAsk = data.lowestListing;

    // Helper to snap price to nearest step
    const snapToStep = (price: number, roundDown = true) => {
      return roundDown
        ? Math.floor(price / STEP_SIZE) * STEP_SIZE
        : Math.ceil(price / STEP_SIZE) * STEP_SIZE;
    };

    // Filter bids: only keep bids below lowest ask (ignore trait-specific bids above floor)
    const validBids = data.offers
      .filter((o) => o.price < floorAsk)
      .sort((a, b) => b.price - a.price); // Sort descending for bids

    // Get asks (listings) sorted ascending
    const asks = [...data.listings].sort((a, b) => a.price - b.price);

    // Calculate total bid depth first
    const totalBidDepth = validBids.reduce((sum, bid) => sum + bid.count, 0);

    // Find price range for bids (snapped to grid)
    const topBid = validBids[0]?.price || 0;
    const topBidStep = snapToStep(topBid, false); // Round up for top
    const bottomBid = validBids[validBids.length - 1]?.price || 0;
    const bottomBidStep = snapToStep(bottomBid, true); // Round down for bottom

    // Bucket bids into steps
    const bidBuckets = new Map<number, number>();
    for (const bid of validBids) {
      const bucket = snapToStep(bid.price, false); // Round up so bid is included in higher bucket
      bidBuckets.set(bucket, (bidBuckets.get(bucket) || 0) + bid.count);
    }

    // Generate bid depth (from low price to high price) - show ALL steps
    const bidDepth: { price: number; bidDepth: number; askDepth: number | null }[] = [];

    if (topBid > 0) {
      let cumulative = totalBidDepth;

      for (let price = bottomBidStep; price <= topBidStep + STEP_SIZE; price = Math.round((price + STEP_SIZE) * 1000) / 1000) {
        // For the last step (above top bid), depth is 0
        const depth = price > topBidStep ? 0 : cumulative;
        bidDepth.push({ price, bidDepth: depth, askDepth: null });
        // Subtract bids at this price level for next iteration
        cumulative -= bidBuckets.get(price) || 0;
      }
    }

    // Bucket asks into steps
    const askBuckets = new Map<number, number>();
    for (const ask of asks) {
      const bucket = snapToStep(ask.price, true); // Round down so ask is included in lower bucket
      askBuckets.set(bucket, (askBuckets.get(bucket) || 0) + ask.count);
    }

    // Generate ask depth - show ALL steps up to where cumulative reaches total bid depth
    const askDepth: { price: number; bidDepth: number | null; askDepth: number }[] = [];
    const floorStep = snapToStep(floorAsk, true);

    // Start with 0 depth at floor step
    askDepth.push({ price: floorStep, bidDepth: null, askDepth: 0 });

    let cumulative = 0;
    // Find max ask price in data
    const maxAskPrice = asks[asks.length - 1]?.price || floorAsk;
    const maxAskStep = snapToStep(maxAskPrice, false);

    // Generate ALL steps, even empty ones
    for (let price = floorStep; price <= maxAskStep; price = Math.round((price + STEP_SIZE) * 1000) / 1000) {
      cumulative += askBuckets.get(price) || 0;

      // Cap at total bid depth
      const cappedCumulative = Math.min(cumulative, totalBidDepth);

      const nextPrice = Math.round((price + STEP_SIZE) * 1000) / 1000;
      askDepth.push({ price: nextPrice, bidDepth: null, askDepth: cappedCumulative });

      // Stop once we've reached total bid depth
      if (cumulative >= totalBidDepth) break;
    }

    // Combine bid and ask data
    const combined = [...bidDepth, ...askDepth];

    return {
      depthData: combined,
      highestBid: topBid,
      lowestAsk: floorAsk,
      maxDepth: totalBidDepth,
    };
  }, [data]);

  if (isLoading) return <ChartSkeleton />;
  if (error || !data) {
    return (
      <Card>
        <CardHeader><span className="text-lg font-bold font-brice">Market Depth</span></CardHeader>
        <p className="text-foreground-muted text-center py-8">Failed to load market depth</p>
      </Card>
    );
  }

  const spreadColor = data.spreadPercent < 5
    ? CHART_COLORS.success
    : data.spreadPercent < 15
      ? CHART_COLORS.primary
      : CHART_COLORS.danger;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <Link href="/charts/market-depth" className="text-lg font-bold text-foreground font-brice hover:text-brand transition-colors">
            Market Depth
          </Link>
          <p className="export-branding text-sm text-brand font-mundial">Good Vibes Club</p>
          <CardDescription>Cumulative bids (green) vs asks (red) by price</CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-4 text-right text-xs">
            <div>
              <p className="font-bold" style={{ color: spreadColor }}>{data.spreadPercent.toFixed(1)}%</p>
              <p className="text-foreground-muted">Spread</p>
            </div>
            <div>
              <p className="font-bold text-chart-success">{formatEth(data.highestOffer, 2)}</p>
              <p className="text-foreground-muted">Top Bid</p>
            </div>
            <div>
              <p className="font-bold text-chart-danger">{formatEth(data.lowestListing, 2)}</p>
              <p className="text-foreground-muted">Floor Ask</p>
            </div>
          </div>
          <ChartExportButtons chartRef={chartRef} config={exportConfig} />
        </div>
      </CardHeader>

      <div ref={chartRef} className="px-1 pt-1 bg-background-secondary rounded-lg chart-container flex-1 flex flex-col">
        <div className="flex-1 min-h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={depthData} margin={{ top: 5, right: 8, left: -5, bottom: 0 }}>
              <defs>
                <linearGradient id="bidGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.success} stopOpacity={0.8} />
                  <stop offset="100%" stopColor={CHART_COLORS.success} stopOpacity={0.3} />
                </linearGradient>
                <linearGradient id="askGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.danger} stopOpacity={0.8} />
                  <stop offset="100%" stopColor={CHART_COLORS.danger} stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="price"
                stroke="#71717a"
                fontSize={11}
                fontFamily="var(--font-mundial)"
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v.toFixed(2)}
                domain={['dataMin', 'dataMax']}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={50}
              />
              <YAxis
                stroke="#71717a"
                fontSize={11}
                fontFamily="var(--font-mundial)"
                axisLine={false}
                tickLine={false}
                width={35}
                domain={[0, maxDepth * 1.1]}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "#141414", border: "1px solid #27272a", borderRadius: "8px" }}
                labelStyle={{ color: "#fafafa" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  const isBid = d.bidDepth > 0;
                  const depth = isBid ? d.bidDepth : d.askDepth;
                  if (depth === 0) return null;
                  return (
                    <div className="bg-background-secondary border border-border rounded-lg p-2 text-xs">
                      <p className="font-bold text-foreground">{Number(label).toFixed(3)} ETH</p>
                      <p style={{ color: isBid ? CHART_COLORS.success : CHART_COLORS.danger }}>
                        {isBid ? "Bids" : "Asks"}: {formatNumber(depth)} cumulative
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="stepAfter"
                dataKey="bidDepth"
                stroke={CHART_COLORS.success}
                strokeWidth={2}
                fill="url(#bidGradient)"
                fillOpacity={1}
              />
              <Area
                type="stepBefore"
                dataKey="askDepth"
                stroke={CHART_COLORS.danger}
                strokeWidth={2}
                fill="url(#askGradient)"
                fillOpacity={1}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-5 mt-2 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: CHART_COLORS.success }} />
            <span className="text-foreground-muted">Bids</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: CHART_COLORS.danger }} />
            <span className="text-foreground-muted">Asks</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
