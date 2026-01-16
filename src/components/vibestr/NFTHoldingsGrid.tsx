"use client";

import { useState } from "react";
import { useNFTHoldings } from "@/hooks/vibestr";
import { formatNumber, formatEth } from "@/lib/utils";

export function NFTHoldingsGrid() {
  const { data: holdings, isLoading, error } = useNFTHoldings();
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const handleImageError = (tokenId: string) => {
    setImageErrors((prev) => new Set(prev).add(tokenId));
  };

  if (isLoading) {
    return (
      <div className="border border-border rounded-xl p-8 bg-background-secondary/50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand border-r-transparent mb-4"></div>
          <p className="text-sm text-foreground-muted">Loading NFT holdings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-border rounded-xl p-8 bg-background-secondary/50">
        <p className="text-sm text-foreground-muted text-center">
          Unable to load NFT holdings
        </p>
      </div>
    );
  }

  if (!holdings || holdings.length === 0) {
    return (
      <div className="border border-border rounded-xl p-8 bg-background-secondary/50">
        <p className="text-sm text-foreground-muted text-center">
          No NFTs found in pool
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-background-secondary/50">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-brice text-foreground mb-1">
              NFT Holdings
            </h3>
            <p className="text-sm text-foreground-muted">
              {formatNumber(holdings.length)} Good Vibes Club NFTs backing VIBESTR
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-foreground-muted mb-1">Listed</div>
            <div className="text-sm font-mundial-bold text-foreground">
              {formatNumber(holdings.filter((n) => n.listingPrice).length)} /{" "}
              {formatNumber(holdings.length)}
            </div>
            <div className="text-xs text-foreground-muted mt-1">
              {((holdings.filter((n) => n.listingPrice).length / holdings.length) * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* NFT Grid */}
      <div className="p-6">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {holdings.map((nft) => (
            <div
              key={nft.tokenId}
              className="aspect-square rounded-lg overflow-hidden border border-border bg-background hover:border-brand/50 transition-all group relative"
            >
              {!imageErrors.has(nft.tokenId) && nft.image ? (
                <img
                  src={nft.image}
                  alt={nft.name}
                  className="w-full h-full object-cover"
                  onError={() => handleImageError(nft.tokenId)}
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-background-secondary">
                  <span className="text-xs text-foreground-muted font-mono">
                    #{nft.tokenId}
                  </span>
                </div>
              )}

              {/* Price badge - always visible */}
              {nft.listingPrice && (
                <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded">
                  <div className="text-xs font-mono text-brand">
                    {formatEth(nft.listingPrice)}
                  </div>
                </div>
              )}

              {/* Hover overlay with token ID and details */}
              <div className="absolute inset-0 bg-black/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2">
                <div className="text-center">
                  <div className="text-xs text-brand font-mono mb-1">
                    #{nft.tokenId}
                  </div>
                  <div className="text-[10px] text-foreground-muted line-clamp-2 mb-2">
                    {nft.name}
                  </div>
                  {nft.listingPrice && (
                    <div className="text-xs text-foreground font-mono">
                      Listed: {formatEth(nft.listingPrice)}
                    </div>
                  )}
                  {nft.bestOffer && (
                    <div className="text-[10px] text-foreground-muted">
                      Best Offer: {formatEth(nft.bestOffer)}
                    </div>
                  )}
                  {!nft.listingPrice && (
                    <div className="text-[10px] text-foreground-muted italic">
                      Not listed
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer info */}
      <div className="px-6 pb-6 pt-2">
        <div className="text-xs text-foreground-muted text-center">
          Showing all {formatNumber(holdings.length)} NFTs held by the VibeStrategy pool
        </div>
      </div>
    </div>
  );
}
