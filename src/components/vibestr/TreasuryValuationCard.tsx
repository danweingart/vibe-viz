"use client";

import { Card } from "@/components/ui";
import { useTreasuryMetrics } from "@/hooks/vibestr";
import { formatEth, formatUsd, formatNumber } from "@/lib/utils";

export function TreasuryValuationCard() {
  const { data: metrics, isLoading, error } = useTreasuryMetrics();

  if (isLoading) {
    return (
      <Card className="p-6">
        <h2 className="font-brice text-xl text-foreground mb-4">Treasury & Valuation</h2>
        <div className="space-y-4">
          <div className="h-20 bg-background-tertiary animate-pulse rounded-lg" />
          <div className="h-16 bg-background-tertiary animate-pulse rounded-lg" />
          <div className="h-16 bg-background-tertiary animate-pulse rounded-lg" />
        </div>
      </Card>
    );
  }

  if (error || !metrics) {
    return (
      <Card className="p-6">
        <h2 className="font-brice text-xl text-foreground mb-4">Treasury & Valuation</h2>
        <div className="rounded-lg border border-danger/50 bg-danger/10 p-4 text-center">
          <p className="text-danger text-sm">Failed to load treasury metrics</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="font-brice text-xl text-foreground mb-1">Treasury & Valuation</h2>
        <p className="text-xs text-foreground-muted">Total assets and NAV ratio</p>
      </div>

      <div className="space-y-6">
        {/* Total Treasury */}
        <div className="p-4 rounded-xl bg-background-tertiary border border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-foreground-muted uppercase tracking-wide font-medium">
              Total Treasury
            </span>
            <div className="text-xs text-foreground-muted">
              ETH Price: ${formatNumber(metrics.ethPriceUsd)}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="font-brice text-2xl text-brand">
                {formatUsd(metrics.totalTreasuryUsd, 2)}
              </span>
              <span className="text-sm text-foreground-muted">
                {formatEth(metrics.totalTreasuryEth)} ETH
              </span>
            </div>

            {/* NAV Ratio */}
            <div className="flex items-center gap-2 pt-2 border-t border-border/50">
              <span className="text-xs text-foreground-muted">NAV Ratio:</span>
              <span className="text-lg font-mundial-bold text-info">
                {metrics.navRatio.toFixed(2)}x
              </span>
            </div>
          </div>
        </div>

        {/* Inventory & Liquidity Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Inventory */}
          <div className="p-4 rounded-lg border border-border bg-background-tertiary">
            <div className="text-xs text-foreground-muted uppercase tracking-wide font-medium mb-2">
              Inventory
            </div>
            <div className="space-y-1">
              <div className="font-mundial-bold text-lg text-foreground">
                {metrics.nftCount}
              </div>
              <div className="text-xs text-foreground-muted">NFTs</div>
              <div className="text-sm text-foreground-muted mt-2 pt-2 border-t border-border/50">
                Est. {formatUsd(metrics.inventoryValueUsd, 0)}
              </div>
            </div>
          </div>

          {/* Liquidity */}
          <div className="p-4 rounded-lg border border-border bg-background-tertiary">
            <div className="text-xs text-foreground-muted uppercase tracking-wide font-medium mb-2">
              Liquidity
            </div>
            <div className="space-y-1">
              <div className="font-mundial-bold text-lg text-foreground">
                ≈{formatEth(metrics.liquidityEth, 2)}
              </div>
              <div className="text-xs text-foreground-muted">ETH</div>
              <div className="text-sm text-foreground-muted mt-2 pt-2 border-t border-border/50">
                Available Balance
              </div>
            </div>
          </div>
        </div>

        {/* Next Floor Purchase Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-foreground-muted uppercase tracking-wide font-medium">
              Next Floor Purchase
            </span>
            <span className={`text-sm font-medium ${
              metrics.canPurchaseFloor ? "text-success" : "text-foreground-muted"
            }`}>
              {metrics.floorPurchaseProgress.toFixed(0)}% Ready
            </span>
          </div>

          {/* Progress Bar */}
          <div className="relative h-3 bg-background-tertiary rounded-full overflow-hidden border border-border">
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                metrics.canPurchaseFloor
                  ? "bg-gradient-to-r from-success to-success/80"
                  : "bg-gradient-to-r from-brand to-brand/80"
              }`}
              style={{ width: `${Math.min(metrics.floorPurchaseProgress, 100)}%` }}
            />
          </div>

          {/* Floor Info */}
          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="text-foreground-muted">Floor Price: </span>
              <span className="text-foreground font-medium">≈{formatEth(metrics.floorPrice, 3)}Ξ</span>
            </div>
            {!metrics.canPurchaseFloor && (
              <div>
                <span className="text-foreground-muted">Missing: </span>
                <span className="text-accent font-medium">
                  {formatEth(metrics.missingForFloor, 2)}Ξ ETH
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
