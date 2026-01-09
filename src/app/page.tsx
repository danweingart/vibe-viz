"use client";

import { useState } from "react";
import { Header, Footer } from "@/components/layout";
import { StatsOverview, RecentSales, TopSales, ChartControls } from "@/components/dashboard";
import { ChartSettingsProvider } from "@/providers/ChartSettingsProvider";
import {
  // Core price & volume charts
  PriceHistoryChart,
  SalesVolumeChart,
  PriceVolatilityChart,
  CumulativeVolumeChart,
  // Market analysis charts
  CollectorsPremiumChart,
  PaymentRatioChart,
  PriceDistributionChart,
  MarketIndicatorsChart,
  // Trader insights charts
  UniqueTradersChart,
  WhaleActivityChart,
  FlipTrackerChart,
  HoldingPeriodChart,
  // Collection health charts
  HolderDistributionChart,
  MarketDepthChart,
} from "@/components/charts";
import { useCollectionStats, useRefreshStats } from "@/hooks";

export default function DashboardPage() {
  const { data: stats } = useCollectionStats();
  const { refresh } = useRefreshStats();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        lastUpdated={stats?.lastUpdated}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <main className="flex-1">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8">
          {/* Hero Section */}
          <div className="mb-12">
            <h1 className="text-3xl md:text-4xl font-brice text-foreground mb-4 hero-accent">
              Good Vibes Club
            </h1>
            <p className="text-foreground-muted text-lg mt-6">
              Real-time analytics and insights for the Good Vibes Club NFT collection
            </p>
          </div>

          {/* Chart Controls & Charts wrapped in provider */}
          <ChartSettingsProvider>
            {/* Stats Overview */}
            <section className="mb-8">
              <StatsOverview />
            </section>

            {/* Universal Chart Controls */}
            <section className="mb-6">
              <ChartControls />
            </section>

            {/* Price & Volume Section */}
            <section className="mb-10">
              <SectionHeader number="01" title="Price & Volume" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PriceHistoryChart />
                <SalesVolumeChart />
                <PriceVolatilityChart />
                <CumulativeVolumeChart />
              </div>
            </section>

            {/* Market Analysis Section */}
            <section className="mb-10">
              <SectionHeader number="02" title="Market Analysis" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CollectorsPremiumChart />
                <PaymentRatioChart />
                <PriceDistributionChart />
                <MarketIndicatorsChart />
              </div>
            </section>

            {/* Trader Insights Section */}
            <section className="mb-10">
              <SectionHeader number="03" title="Trader Insights" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <UniqueTradersChart />
                <WhaleActivityChart />
                <FlipTrackerChart />
                <HoldingPeriodChart />
              </div>
            </section>

            {/* Collection Health Section */}
            <section className="mb-10">
              <SectionHeader number="04" title="Collection Health" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <HolderDistributionChart />
                <MarketDepthChart />
              </div>
            </section>

            {/* Recent & Top Sales */}
            <section className="mb-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RecentSales />
                <TopSales />
              </div>
            </section>
          </ChartSettingsProvider>

          {/* Info Section */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <InfoCard
              icon="📊"
              title="Export Charts"
              description="Download any chart as a high-resolution PNG for sharing on social media."
            />
            <InfoCard
              icon="🔄"
              title="Compare Markets"
              description="Toggle 'Compare' to see GVC vs leading ETH collections like BAYC and Azuki."
            />
            <InfoCard
              icon="📈"
              title="Market Indicators"
              description="RSI, momentum, and liquidity scores help identify market sentiment."
            />
            <InfoCard
              icon="🐋"
              title="Whale Tracking"
              description="Monitor top buyers and sellers to understand who's driving the market."
            />
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function SectionHeader({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-xs font-mono text-brand/80 bg-brand/10 px-2 py-1 rounded">{number}</span>
      <h2 className="text-lg font-brice text-foreground">{title}</h2>
      <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
    </div>
  );
}

function InfoCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-xl border border-border bg-background-secondary p-5 hover:border-brand/30 transition-colors">
      <div className="flex items-center gap-2.5 mb-2">
        <span className="text-lg grayscale group-hover:grayscale-0 transition-all">{icon}</span>
        <h3 className="font-brice text-foreground text-sm">{title}</h3>
      </div>
      <p className="text-xs text-foreground-muted leading-relaxed">{description}</p>
    </div>
  );
}
