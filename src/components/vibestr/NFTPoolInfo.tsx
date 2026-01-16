"use client";

import { useTokenStats } from "@/hooks/vibestr";
import { formatEth, formatNumber } from "@/lib/utils";

export function NFTPoolInfo() {
  const { data: stats, isLoading } = useTokenStats();

  if (isLoading || !stats) {
    return (
      <div className="border border-border rounded-xl p-6 bg-background-secondary/50">
        <div className="animate-pulse">
          <div className="h-6 bg-border rounded w-48 mb-4" />
          <div className="h-4 bg-border rounded w-64" />
        </div>
      </div>
    );
  }

  const openseaUrl = `https://opensea.io/collection/${stats.collectionSlug}`;

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-background-secondary/50">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-brice text-foreground mb-1">
              NFT Pool Information
            </h3>
            <p className="text-sm text-foreground-muted">
              Good Vibes Club NFTs backing the VIBESTR token
            </p>
          </div>
          <a
            href={openseaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-brand hover:text-brand/80 transition-colors"
          >
            View on OpenSea ↗
          </a>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 p-6">
        <div>
          <div className="text-xs text-foreground-muted mb-1">
            Total NFTs in Pool
          </div>
          <div className="text-2xl font-mundial-bold text-foreground">
            {formatNumber(stats.holdingsCount)}
          </div>
          <div className="text-xs text-foreground-muted mt-1">
            {stats.collectionName}
          </div>
        </div>

        <div>
          <div className="text-xs text-foreground-muted mb-1">
            Collection Floor
          </div>
          <div className="text-2xl font-mundial-bold text-foreground">
            {formatEth(stats.floorPrice)}
          </div>
          <div className="text-xs text-foreground-muted mt-1">
            per NFT on OpenSea
          </div>
        </div>

        <div>
          <div className="text-xs text-foreground-muted mb-1">
            NFT Contract
          </div>
          <div className="text-xs font-mono text-foreground break-all">
            {stats.nftContract.slice(0, 10)}...{stats.nftContract.slice(-8)}
          </div>
        </div>

        <div>
          <div className="text-xs text-foreground-muted mb-1">
            Pool Value (Est.)
          </div>
          <div className="text-lg font-mundial-bold text-brand">
            {formatEth(stats.holdingsCount * stats.floorPrice)}
          </div>
          <div className="text-xs text-foreground-muted mt-1">
            at current floor price
          </div>
        </div>
      </div>

      {/* Info Note */}
      <div className="px-6 pb-6">
        <div className="bg-background/50 border border-border rounded-lg p-4">
          <p className="text-xs text-foreground-muted leading-relaxed">
            <strong className="text-foreground">About VibeStrategy:</strong> Each
            VIBESTR token is backed by Good Vibes Club NFTs held in the protocol
            pool. Holders can redeem tokens for NFTs or trade on Uniswap V4.
          </p>
        </div>
      </div>
    </div>
  );
}
