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
import { StatCard, PageHero } from "@/components/ui";
import { useCollectionStats } from "@/hooks";
import { formatEth, formatUsd, formatNumber } from "@/lib/utils";

export default function SalesPage() {
  const { data: stats } = useCollectionStats();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8">
          <PageHero title="Sales Analytics" size="md">
            Comprehensive sales data and trends for Good Vibes Club
          </PageHero>

          {/* Key Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
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
            <div className="mb-6">
              <ChartControls />
            </div>
            <div className="space-y-6">
              {/* 2-column grid for all chart tiles */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PriceHistoryChart />
                <VolumeChart />
                <CollectorsPremiumChart />
                <PriceDistributionChart />
                <PaymentRatioChart />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
