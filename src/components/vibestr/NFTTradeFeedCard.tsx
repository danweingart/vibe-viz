"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import { Card, CardHeader, CardTitle, CardDescription, Button } from "@/components/ui";
import { ShareButton } from "@/components/charts/ShareButton";
import { ExportBrandingBar } from "@/components/charts/ExportBrandingBar";
import { useNFTTradeFeed } from "@/hooks/vibestr";
import { formatEth, formatPercent } from "@/lib/utils";
import { exportNFTSaleToCanvas } from "@/lib/nftSaleExport";

// Date range filter options
type DateRange = "today" | "yesterday" | "3d" | "7d";

interface NFTSaleRowProps {
  nft: any;
  onExport: (nft: any) => void;
  isExporting: boolean;
}

function NFTSaleRow({ nft, onExport, isExporting }: NFTSaleRowProps) {
  const profit = (nft.salePrice || 0) - nft.purchasePrice;
  const profitPercent = (profit / nft.purchasePrice) * 100;
  const isProfit = profit > 0;

  // Calculate time ago from Unix timestamp
  const timeAgo = (timestamp: number) => {
    const seconds = Date.now() / 1000 - timestamp;
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "just now";
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background-tertiary hover:bg-background-tertiary/70 transition-colors">
      {/* NFT Image */}
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-background flex-shrink-0 relative">
        {nft.imageUrl ? (
          <Image
            src={nft.imageUrl}
            alt={`Citizen of Vibetown #${nft.tokenId}`}
            width={48}
            height={48}
            className="object-cover"
            onError={(e) => {
              // Fallback to placeholder on error
              e.currentTarget.style.display = 'none';
              if (e.currentTarget.nextSibling) {
                (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex';
              }
            }}
          />
        ) : null}
        <div
          className="w-full h-full bg-gradient-to-br from-brand/20 to-brand/5 flex items-center justify-center border border-brand/20 rounded-lg"
          style={{ display: nft.imageUrl ? 'none' : 'flex' }}
        >
          <span className="text-xs font-mundial-bold text-brand/60">#{nft.tokenId.slice(-3)}</span>
        </div>
      </div>

      {/* NFT Info */}
      <div className="flex-1 min-w-0">
        <div className="font-mundial-bold text-sm text-foreground truncate">
          Citizen of Vibetown #{nft.tokenId}
        </div>
        <div className="flex items-center gap-2 text-xs text-foreground-muted">
          <span>Bought: {formatEth(nft.purchasePrice, 3)}Ξ</span>
          <span>→</span>
          <span>Sold: {formatEth(nft.salePrice || 0, 3)}Ξ</span>
        </div>
      </div>

      {/* Profit/Loss */}
      <div className="text-right flex-shrink-0">
        <div className={`font-mundial-bold text-sm ${isProfit ? "text-success" : "text-danger"}`}>
          {isProfit ? "+" : ""}{formatEth(profit, 3)}Ξ
        </div>
        <div className={`text-xs ${isProfit ? "text-success" : "text-danger"}`}>
          {isProfit ? "+" : ""}{formatPercent(profitPercent)}
        </div>
      </div>

      {/* Time Ago */}
      <div className="text-xs text-foreground-muted flex-shrink-0 w-16 text-right">
        {nft.saleDate ? timeAgo(nft.saleDate) : "—"}
      </div>

      {/* Export Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onExport(nft)}
        disabled={isExporting}
        aria-label={`Download graphic for sale #${nft.tokenId}`}
        className="flex-shrink-0"
      >
        <DownloadIcon className="w-4 h-4" />
      </Button>
    </div>
  );
}

export function NFTTradeFeedCard() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dateRange, setDateRange] = useState<DateRange>("7d");
  const [exportingTokenId, setExportingTokenId] = useState<string | null>(null);
  const [showBranding, setShowBranding] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const resolveRef = useRef<((el: HTMLDivElement | null) => void) | null>(null);

  // Calculate days based on date range and apply filtering
  const { days, startTime, endTime } = useMemo(() => {
    const now = Date.now() / 1000;
    const currentDate = new Date();

    switch (dateRange) {
      case "today": {
        // Today: midnight to now
        const todayMidnight = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()).getTime() / 1000;
        return { days: 1, startTime: todayMidnight, endTime: now };
      }
      case "yesterday": {
        // Yesterday: yesterday's midnight to yesterday's end of day
        const yesterdayMidnight = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 1).getTime() / 1000;
        const yesterdayEnd = yesterdayMidnight + 86400;
        return { days: 2, startTime: yesterdayMidnight, endTime: yesterdayEnd };
      }
      case "3d":
        return { days: 3, startTime: now - (3 * 86400), endTime: now };
      case "7d":
      default:
        return { days: 7, startTime: now - (7 * 86400), endTime: now };
    }
  }, [dateRange]);

  const { data, isLoading, error } = useNFTTradeFeed({ days, page, pageSize });

  // Filter data based on the exact date range
  const filteredData = useMemo(() => {
    if (!data) return null;

    const filtered = data.history.filter(nft => {
      if (!nft.saleDate) return false;
      return nft.saleDate >= startTime && nft.saleDate <= endTime;
    });

    return {
      ...data,
      history: filtered,
      count: filtered.length,
    };
  }, [data, startTime, endTime]);

  // Export config for ShareButton
  const exportConfig = useMemo(() => ({
    title: "NFT Trade Feed",
    filename: `gvc-nft-trades-${dateRange}-${Date.now()}`,
  }), [dateRange]);

  // Trigger export and return the card element
  const getExportElement = useCallback((): Promise<HTMLDivElement | null> => {
    if (!cardRef.current) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setShowBranding(true);
      // Wait for branding bar to render
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (resolveRef.current) {
            resolveRef.current(cardRef.current);
            resolveRef.current = null;
          }
        }, 100);
      });
    });
  }, []);

  // Clean up after export
  const finishExport = useCallback(() => {
    setShowBranding(false);
  }, []);

  // Handle individual NFT sale export
  const handleExportSale = useCallback(async (nft: any) => {
    setExportingTokenId(nft.tokenId);
    try {
      await exportNFTSaleToCanvas(nft);
    } catch (error) {
      console.error("Failed to export NFT sale:", error);
    } finally {
      setExportingTokenId(null);
    }
  }, []);

  // Handle date range change and reset page
  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    setPage(1);
  };

  // Handle page size change and reset page
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <CardHeader>
          <CardTitle>NFT Trade Feed</CardTitle>
        </CardHeader>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-background-tertiary animate-pulse rounded-lg" />
          ))}
        </div>
      </Card>
    );
  }

  if (error || !filteredData) {
    return (
      <Card className="p-6">
        <CardHeader>
          <CardTitle>NFT Trade Feed</CardTitle>
        </CardHeader>
        <div className="rounded-lg border border-danger/50 bg-danger/10 p-4 text-center">
          <p className="text-danger text-sm">Failed to load trade feed</p>
        </div>
      </Card>
    );
  }

  const totalPages = Math.ceil(filteredData.count / pageSize);

  const dateRangeLabels: Record<DateRange, string> = {
    today: "Today",
    yesterday: "Yesterday",
    "3d": "Last 3 Days",
    "7d": "Last 7 Days",
  };

  return (
    <div ref={cardRef}>
      <Card className="p-6">
        {/* Export branding bar - only visible during export */}
        <ExportBrandingBar visible={showBranding} />

        {/* Header */}
        <div className="flex flex-row items-start justify-between mb-4">
          <div className="flex-1">
            <CardTitle>NFT Trade Feed</CardTitle>
            <CardDescription>
              Real-time NFT trading activity for the VIBESTR strategy
            </CardDescription>
          </div>
          <div className={showBranding ? "invisible" : ""}>
            <ShareButton
              getExportElement={getExportElement}
              finishExport={finishExport}
              config={exportConfig}
            />
          </div>
        </div>

        {/* Date Range Filters - hide during export */}
        {!showBranding && (
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs text-foreground-subtle uppercase tracking-wider font-medium">Period</span>
            <div className="flex gap-1.5 p-1 rounded-full bg-background-tertiary border border-border/50">
              {(["today", "yesterday", "3d", "7d"] as DateRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => handleDateRangeChange(range)}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 active:scale-95 ${
                    dateRange === range
                      ? "bg-brand text-background shadow-sm shadow-brand/20"
                      : "text-foreground-muted hover:text-foreground hover:bg-border/30"
                  }`}
                >
                  {range === "today" ? "Today" : range === "yesterday" ? "Yesterday" : range === "3d" ? "3D" : "7D"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="flex items-center gap-4 text-xs text-foreground-muted mb-4">
          <span className="font-medium">{filteredData.count} trades</span>
          <span className="text-foreground-muted">|</span>
          <span className="font-medium">
            {formatEth(filteredData.summary.totalProceeds, 2)} ETH total
          </span>
          <span className="text-foreground-muted">|</span>
          <span className="font-medium">
            Period: {dateRangeLabels[dateRange]}
          </span>
        </div>

        {/* Trade List */}
        <div className="space-y-2 mb-4">
          {filteredData.history.length === 0 ? (
            <div className="text-center py-8 text-foreground-muted text-sm">
              No trades in {dateRangeLabels[dateRange].toLowerCase()}
            </div>
          ) : (
            filteredData.history.map((nft) => (
              <NFTSaleRow
                key={nft.tokenId}
                nft={nft}
                onExport={handleExportSale}
                isExporting={exportingTokenId === nft.tokenId}
              />
            ))
          )}
        </div>

        {/* Pagination Controls - hide during export */}
        {!showBranding && totalPages > 0 && (
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            {/* Page Size Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-foreground-muted">Show:</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="px-2 py-1.5 text-xs rounded-lg border border-border bg-background-tertiary hover:bg-background-tertiary/70 focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value={10}>10 sales</option>
                <option value={25}>25 sales</option>
                <option value={50}>50 sales</option>
              </select>
            </div>

            {/* Page Navigation */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-border bg-background-tertiary hover:bg-background-tertiary/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>

              <span className="text-sm text-foreground-muted">
                Page {page} / {totalPages}
              </span>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-border bg-background-tertiary hover:bg-background-tertiary/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}
