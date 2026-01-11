"use client";

import { useCallback, useState } from "react";
import { Card, CardHeader, CardTitle, Badge, OpenSeaIcon, Button } from "@/components/ui";
import { Skeleton } from "@/components/ui/Skeleton";
import { SaleShareButton } from "./SaleShareButton";
import { useRecentSales } from "@/hooks";
import { formatEth, formatUsd, formatTimeAgo } from "@/lib/utils";
import { exportSalesListToCanvas, shareSalesListToX } from "@/lib/salesListExport";

export function RecentSales() {
  const { data: sales, isLoading, error } = useRecentSales(8);
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!sales || sales.length === 0) return;
    setIsExporting(true);
    try {
      await exportSalesListToCanvas(sales, { type: "recent" });
    } catch (error) {
      console.error("Failed to export:", error);
    } finally {
      setIsExporting(false);
    }
  }, [sales]);

  const handleShare = useCallback(async () => {
    if (!sales || sales.length === 0) return;
    setIsSharing(true);
    try {
      await shareSalesListToX(sales, { type: "recent" });
    } catch (error) {
      console.error("Failed to share:", error);
    } finally {
      setIsSharing(false);
    }
  }, [sales]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
        </CardHeader>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="text-right">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (error || !sales) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
        </CardHeader>
        <p className="text-foreground-muted text-center py-8">
          Failed to load recent sales
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Sales</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="info">{sales.length} latest</Badge>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              isLoading={isSharing}
              aria-label="Share to X"
            >
              <XIcon className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              isLoading={isExporting}
              aria-label="Download as PNG"
            >
              <DownloadIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <div className="space-y-3">
        {sales.map((sale) => (
          <div key={sale.id} className="sale-item flex items-center gap-2 sm:gap-4 p-2 sm:p-3 rounded-lg">
            <a
              href={`https://opensea.io/assets/ethereum/0xb8ea78fcacef50d41375e44e6814ebba36bb33c4/${sale.tokenId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0"
            >
            {/* NFT Image */}
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-border overflow-hidden flex-shrink-0">
              {sale.imageUrl ? (
                <img
                  src={sale.imageUrl}
                  alt={sale.tokenName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-foreground-muted">
                  #{sale.tokenId}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate flex items-center gap-1.5">
                <span>{sale.tokenName}</span>
                <span className="text-foreground-muted hover:text-[#2081e2] transition-colors">
                  <OpenSeaIcon size={12} />
                </span>
              </p>
              <p className="text-xs text-foreground-muted">
                {formatTimeAgo(sale.timestamp)}
              </p>
            </div>

            {/* Price */}
            <div className="text-right flex-shrink-0">
              <p className={`font-bold ${sale.paymentToken === "WETH" ? "text-yellow-400" : "text-foreground"}`}>
                {sale.priceEth.toFixed(2)} {sale.paymentToken === "OTHER" ? sale.paymentSymbol : sale.paymentToken}
              </p>
              <span className="text-xs text-foreground-muted">
                {formatUsd(sale.priceUsd)}
              </span>
            </div>
            </a>
            <SaleShareButton sale={sale} className="flex-shrink-0" />
          </div>
        ))}
      </div>
    </Card>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
