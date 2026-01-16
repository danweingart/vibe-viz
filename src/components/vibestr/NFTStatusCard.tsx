"use client";

import { useNFTHistory } from "@/hooks/vibestr";
import { formatNumber, formatPercent } from "@/lib/utils";

export function NFTStatusCard() {
  const { data, isLoading, error } = useNFTHistory('all');

  if (isLoading) {
    return (
      <div className="border border-border rounded-xl p-6 bg-background-secondary/50">
        <div className="animate-pulse">
          <div className="h-6 bg-border rounded w-48 mb-4" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 bg-border rounded" />
            <div className="h-20 bg-border rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data || !data.summary) {
    return (
      <div className="border border-chart-danger/50 rounded-xl p-6 bg-chart-danger/10">
        <p className="text-chart-danger text-sm">
          Failed to load NFT status. Please run blockchain sync first.
        </p>
      </div>
    );
  }

  const { summary } = data;
  const totalPurchased = summary.currentlyHeld + summary.totalSold;
  const totalPercent = totalPurchased > 0 ? 100 : 0;
  const heldPercent =
    totalPurchased > 0
      ? (summary.currentlyHeld / totalPurchased) * 100
      : 0;
  const soldPercent =
    totalPurchased > 0
      ? (summary.totalSold / totalPurchased) * 100
      : 0;

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-background-secondary/50">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-brice text-foreground mb-1">
          NFT Portfolio Status
        </h3>
        <p className="text-sm text-foreground-muted">
          Good Vibes Club NFTs managed by the strategy
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 p-6">
        {/* Currently Held */}
        <div className="border border-chart-success/30 rounded-lg p-4 bg-chart-success/5">
          <div className="text-xs text-foreground-muted mb-2 uppercase tracking-wide">
            Currently Held
          </div>
          <div className="text-3xl font-mundial-bold text-chart-success mb-1">
            {formatNumber(summary.currentlyHeld)}
          </div>
          <div className="text-xs text-foreground-muted">
            {formatPercent(heldPercent)} of total
          </div>
        </div>

        {/* Previously Sold */}
        <div className="border border-brand/30 rounded-lg p-4 bg-brand/5">
          <div className="text-xs text-foreground-muted mb-2 uppercase tracking-wide">
            Previously Sold
          </div>
          <div className="text-3xl font-mundial-bold text-brand mb-1">
            {formatNumber(summary.totalSold)}
          </div>
          <div className="text-xs text-foreground-muted">
            {formatPercent(soldPercent)} of total
          </div>
        </div>

        {/* Total Purchased */}
        <div className="col-span-2 border border-border rounded-lg p-4 bg-background/50">
          <div className="text-xs text-foreground-muted mb-2 uppercase tracking-wide">
            Total Purchased
          </div>
          <div className="text-2xl font-mundial-bold text-foreground mb-1">
            {formatNumber(totalPurchased)}
          </div>
          <div className="text-xs text-foreground-muted">
            Lifetime NFT acquisitions
          </div>
        </div>
      </div>

      {/* Visual Progress Bar */}
      <div className="px-6 pb-6">
        <div className="bg-background/50 border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-chart-success">
              {formatNumber(summary.currentlyHeld)} Held
            </span>
            <span className="text-xs font-medium text-brand">
              {formatNumber(summary.totalSold)} Sold
            </span>
          </div>
          <div className="h-3 bg-background rounded-full overflow-hidden flex">
            <div
              className="bg-chart-success"
              style={{ width: `${heldPercent}%` }}
            />
            <div className="bg-brand" style={{ width: `${soldPercent}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
