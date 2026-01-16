"use client";

import { Card } from "@/components/ui";
import { useTokenStats } from "@/hooks/vibestr";
import { formatEth, formatNumber } from "@/lib/utils";
import { calculateFeeBreakdown } from "@/lib/vibestr/calculations";

export function FeesPnLCard() {
  const { data: stats, isLoading, error } = useTokenStats();

  if (isLoading) {
    return (
      <Card className="p-6">
        <h2 className="font-brice text-xl text-foreground mb-4">Fees & PnL</h2>
        <div className="space-y-4">
          <div className="h-20 bg-background-tertiary animate-pulse rounded-lg" />
          <div className="h-16 bg-background-tertiary animate-pulse rounded-lg" />
        </div>
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card className="p-6">
        <h2 className="font-brice text-xl text-foreground mb-4">Fees & PnL</h2>
        <div className="rounded-lg border border-danger/50 bg-danger/10 p-4 text-center">
          <p className="text-danger text-sm">Failed to load fee data</p>
        </div>
      </Card>
    );
  }

  // Calculate fee breakdown (8% strategy, 1% platform, 1% royalties)
  const feeBreakdown = calculateFeeBreakdown(stats.currentFees);

  // TODO: Get real buy/sell volume from API when available
  // For now, using placeholder values based on volume24h
  const estimatedBuyVolume = stats.volume24h * 0.6; // 60% buys estimate
  const estimatedSellVolume = stats.volume24h * 0.4; // 40% sells estimate

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="font-brice text-xl text-foreground mb-1">Fees & PnL</h2>
        <p className="text-xs text-foreground-muted">Lifetime fees and trading volume</p>
      </div>

      <div className="space-y-6">
        {/* Lifetime Fees Generated */}
        <div className="space-y-3">
          <div className="text-xs text-foreground-muted uppercase tracking-wide font-medium">
            Lifetime Fees Generated
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Strategy Fee (8%) */}
            <div className="p-3 rounded-lg bg-background-tertiary border border-border">
              <div className="text-[10px] text-foreground-muted mb-1">Strategy (8%)</div>
              <div className="font-mundial-bold text-sm text-foreground">
                Ξ{formatEth(feeBreakdown.strategyFees, 3)}
              </div>
            </div>

            {/* Platform Fee (1%) */}
            <div className="p-3 rounded-lg bg-background-tertiary border border-border">
              <div className="text-[10px] text-foreground-muted mb-1">Platform (1%)</div>
              <div className="font-mundial-bold text-sm text-foreground">
                Ξ{formatEth(feeBreakdown.platformFees, 3)}
              </div>
            </div>

            {/* Royalties (1%) */}
            <div className="p-3 rounded-lg bg-background-tertiary border border-border">
              <div className="text-[10px] text-foreground-muted mb-1">Royalties (1%)</div>
              <div className="font-mundial-bold text-sm text-foreground">
                Ξ{formatEth(feeBreakdown.royaltyFees, 3)}
              </div>
            </div>
          </div>
        </div>

        {/* Total Realized P&L - Placeholder for now */}
        <div className="p-4 rounded-xl bg-background-tertiary border border-success/30">
          <div className="text-xs text-foreground-muted uppercase tracking-wide font-medium mb-2">
            Total Fees Collected
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-brice text-3xl text-success">
              Ξ{formatEth(stats.currentFees, 3)}
            </span>
            <span className="text-sm text-foreground-muted">
              {feeBreakdown.totalPercent}% total
            </span>
          </div>
        </div>

        {/* Buy/Sale Volume */}
        <div className="space-y-3">
          <div className="text-xs text-foreground-muted uppercase tracking-wide font-medium">
            Buy / Sale Volume (24H Estimate)
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Buys */}
            <div className="p-4 rounded-lg border border-success/30 bg-success/5">
              <div className="text-xs text-foreground-muted mb-2">Buys</div>
              <div className="space-y-1">
                <div className="font-mundial-bold text-lg text-success">
                  Ξ{formatEth(estimatedBuyVolume, 2)}
                </div>
                <div className="text-[10px] text-foreground-muted">
                  Est. ~60% of volume
                </div>
              </div>
            </div>

            {/* Sells */}
            <div className="p-4 rounded-lg border border-danger/30 bg-danger/5">
              <div className="text-xs text-foreground-muted mb-2">Sells</div>
              <div className="space-y-1">
                <div className="font-mundial-bold text-lg text-danger">
                  Ξ{formatEth(estimatedSellVolume, 2)}
                </div>
                <div className="text-[10px] text-foreground-muted">
                  Est. ~40% of volume
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Note about estimates */}
        <div className="text-[10px] text-foreground-muted/60 text-center pt-2 border-t border-border/50">
          * Buy/sell split estimated from 24h volume. Real-time data coming soon.
        </div>
      </div>
    </Card>
  );
}
