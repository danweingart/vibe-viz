"use client";

import { Header, Footer } from "@/components/layout";
import { HolderDistributionChart, SalesVelocityChart } from "@/components/charts";
import { ChartSettingsProvider } from "@/providers/ChartSettingsProvider";
import { ChartControls } from "@/components/dashboard";
import { Card, CardHeader, CardTitle, Badge, OpenSeaLink } from "@/components/ui";
import { useRecentSales, useCollectionStats } from "@/hooks";
import { formatEth, formatUsd, formatAddress, formatTimeAgo } from "@/lib/utils";

export default function WhalesPage() {
  const { data: stats } = useCollectionStats();
  const { data: recentSales } = useRecentSales(50);

  // Find large transactions (whales typically make bigger purchases)
  const largeSales = recentSales
    ?.filter((sale) => sale.priceEth >= 0.5)
    .slice(0, 10) || [];

  // Find frequent buyers
  const buyerCounts = new Map<string, number>();
  recentSales?.forEach((sale) => {
    buyerCounts.set(sale.buyer, (buyerCounts.get(sale.buyer) || 0) + 1);
  });
  const frequentBuyers = Array.from(buyerCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-brice text-foreground mb-2">
              Whale Activity
            </h1>
            <p className="text-foreground-muted">
              Track large holders and significant transactions
            </p>
          </div>

          {/* Whale Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="rounded-xl border border-border bg-background-secondary p-4">
              <p className="text-xs text-foreground-muted uppercase tracking-wide mb-1">Est. Whale Count</p>
              <p className="text-xl font-bold text-foreground font-brice">
                {stats?.numOwners ? Math.round(stats.numOwners * 0.05) : 0}
              </p>
              <p className="text-xs text-foreground-muted">Top 5% holders</p>
            </div>
            <div className="rounded-xl border border-border bg-background-secondary p-4">
              <p className="text-xs text-foreground-muted uppercase tracking-wide mb-1">Large Sales (24h)</p>
              <p className="text-xl font-bold text-foreground font-brice">{largeSales.length}</p>
              <p className="text-xs text-foreground-muted">≥0.5 ETH</p>
            </div>
            <div className="rounded-xl border border-border bg-background-secondary p-4">
              <p className="text-xs text-foreground-muted uppercase tracking-wide mb-1">Avg Whale Price</p>
              <p className="text-xl font-bold text-foreground font-brice">
                {largeSales.length > 0
                  ? formatEth(largeSales.reduce((sum, s) => sum + s.priceEth, 0) / largeSales.length, 3)
                  : "N/A"}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background-secondary p-4">
              <p className="text-xs text-foreground-muted uppercase tracking-wide mb-1">Unique Holders</p>
              <p className="text-xl font-bold text-foreground font-brice">{stats?.numOwners || 0}</p>
            </div>
          </div>

          <ChartSettingsProvider>
            <div className="mb-4">
              <ChartControls />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <HolderDistributionChart />
              <SalesVelocityChart />
            </div>
          </ChartSettingsProvider>

          {/* Large Transactions */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Large Transactions</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              {largeSales.length > 0 ? (
                largeSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-background-tertiary"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-border overflow-hidden">
                        {sale.imageUrl ? (
                          <img
                            src={sale.imageUrl}
                            alt={sale.tokenName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-xs text-foreground-muted">
                            #{sale.tokenId}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground flex items-center gap-1.5">
                          {sale.tokenName}
                          <OpenSeaLink type="token" value={sale.tokenId} size={12} />
                        </p>
                        <p className="text-xs text-foreground-muted flex items-center gap-1">
                          {formatAddress(sale.buyer)}
                          <OpenSeaLink type="wallet" value={sale.buyer} size={10} />
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">{formatEth(sale.priceEth, 2)}</p>
                      <p className="text-xs text-foreground-muted">{formatTimeAgo(sale.timestamp)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-foreground-muted py-8">
                  No large transactions in recent activity
                </p>
              )}
            </div>
          </Card>

          {/* Frequent Buyers */}
          <Card>
            <CardHeader>
              <CardTitle>Most Active Buyers (Recent)</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              {frequentBuyers.length > 0 ? (
                frequentBuyers.map(([address, count], index) => (
                  <div
                    key={address}
                    className="flex items-center justify-between p-3 rounded-lg bg-background-tertiary"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-brand/20 flex items-center justify-center text-brand font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-foreground">
                          {formatAddress(address, 6)}
                        </span>
                        <OpenSeaLink type="wallet" value={address} size={12} />
                      </div>
                    </div>
                    <Badge variant="info">{count} purchases</Badge>
                  </div>
                ))
              ) : (
                <p className="text-center text-foreground-muted py-8">
                  No buyer activity data available
                </p>
              )}
            </div>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
