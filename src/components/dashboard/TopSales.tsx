"use client";

import { useMemo } from "react";
import { Card, CardHeader, CardTitle, Badge, OpenSeaIcon } from "@/components/ui";
import { Skeleton } from "@/components/ui/Skeleton";
import { SaleShareButton } from "./SaleShareButton";
import { useSalesByTimeRange } from "@/hooks";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatUsd, formatDate } from "@/lib/utils";

export function TopSales() {
  const { timeRange } = useChartSettings();
  const { data: sales, isLoading, error } = useSalesByTimeRange(timeRange);

  const topSales = useMemo(() => {
    if (!sales) return [];
    // Sort by price descending and take top 8
    return [...sales]
      .sort((a, b) => b.priceEth - a.priceEth)
      .slice(0, 8);
  }, [sales]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Sales</CardTitle>
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
          <CardTitle>Top Sales</CardTitle>
        </CardHeader>
        <p className="text-foreground-muted text-center py-8">
          Failed to load top sales
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Top Sales</CardTitle>
        <Badge variant="warning">{timeRange}D highest</Badge>
      </CardHeader>
      <div className="space-y-3">
        {topSales.map((sale, index) => (
          <div key={sale.id} className="sale-item flex items-center gap-2 sm:gap-4 p-2 sm:p-3 rounded-lg">
            <a
              href={`https://opensea.io/assets/ethereum/0xb8ea78fcacef50d41375e44e6814ebba36bb33c4/${sale.tokenId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0"
            >
            {/* Rank */}
            <div className="w-6 h-6 rounded-full bg-brand/20 flex items-center justify-center text-xs font-bold text-brand">
              {index + 1}
            </div>

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
                {formatDate(sale.timestamp)}
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
