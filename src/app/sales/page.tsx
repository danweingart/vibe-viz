"use client";

import { Header, Footer } from "@/components/layout";
import { RecentSales, TopSales, ChartControls } from "@/components/dashboard";
import { ChartSettingsProvider } from "@/providers/ChartSettingsProvider";
import {
  PriceHistoryChart,
  VolumeChart,
  PaymentRatioChart,
  PriceDistributionChart,
  CollectorsPremiumChart,
} from "@/components/charts";
import { useCollectionStats } from "@/hooks";
import { formatEth, formatUsd, formatNumber } from "@/lib/utils";

export default function SalesPage() {
  const { data: stats } = useCollectionStats();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-brice text-foreground mb-2">
              Sales Analytics
            </h1>
            <p className="text-foreground-muted">
              Comprehensive sales data and trends for Good Vibes Club
            </p>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="24h Volume"
              value={formatEth(stats?.volume24h || 0, 2)}
              subValue={formatUsd(stats?.volume24hUsd || 0)}
            />
            <StatCard
              label="24h Sales"
              value={formatNumber(stats?.sales24h || 0)}
            />
            <StatCard
              label="Total Volume"
              value={formatEth(stats?.totalVolume || 0, 0)}
              subValue={formatUsd(stats?.totalVolumeUsd || 0)}
            />
            <StatCard
              label="Total Sales"
              value={formatNumber(stats?.totalSales || 0)}
            />
          </div>

          {/* Charts */}
          <ChartSettingsProvider>
            <div className="mb-4">
              <ChartControls />
            </div>
            <div className="space-y-4">
              {/* 2-column grid for all chart tiles */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <PriceHistoryChart />
                <VolumeChart />
                <CollectorsPremiumChart />
                <PriceDistributionChart />
                <PaymentRatioChart />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <RecentSales />
                <TopSales />
              </div>
            </div>
          </ChartSettingsProvider>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function StatCard({
  label,
  value,
  subValue,
}: {
  label: string;
  value: string;
  subValue?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background-secondary p-4">
      <p className="text-xs text-foreground-muted uppercase tracking-wide mb-1">{label}</p>
      <p className="text-xl font-bold text-foreground font-brice">{value}</p>
      {subValue && <p className="text-xs text-foreground-muted">{subValue}</p>}
    </div>
  );
}
