"use client";

import { useState } from "react";
import { Header, Footer } from "@/components/layout";
import { StatsOverview, RecentSales, TopSales, ChartControls } from "@/components/dashboard";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
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
  // Trader insights charts
  UniqueTradersChart,
  WhaleActivityChart,
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
    <div className="min-h-screen flex flex-col relative">
      {/* Floating particles effect */}
      <FloatingParticles count={40} />

      {/* Grid pattern background */}
      <div className="fixed inset-0 bg-grid-pattern opacity-100 pointer-events-none z-0" />

      <main className="flex-1 relative z-10">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8">
          {/* Hero Section */}
          <div className="mb-16 relative">
            {/* Decorative glow behind title */}
            <div className="absolute -top-8 -left-4 w-64 h-32 bg-brand/5 blur-3xl rounded-full pointer-events-none" />

            <div className="relative">
              <h1 className="text-5xl font-brice text-brand mb-3 tracking-tight glowing-text relative inline-block">
                Good Vibes Club
                <div className="absolute inset-0 blur-[40px] bg-brand/20 animate-glow-pulse -z-10" />
              </h1>
              <p className="text-gvc-text-muted text-base sm:text-lg max-w-xl">
                Real-time analytics and market insights for the <span className="text-brand font-medium">Good Vibes Club</span> NFT collection on Ethereum
              </p>
            </div>
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
            <section className="mb-8">
              <SectionHeader number="01" title="Price & Volume" />
              <div className="space-y-6">
                <PriceHistoryChart />
                <SalesVolumeChart />
                <PriceVolatilityChart />
                <CumulativeVolumeChart />
              </div>
            </section>

            {/* Market Analysis Section */}
            <section className="mb-8">
              <SectionHeader number="02" title="Market Analysis" />
              <div className="space-y-6">
                <CollectorsPremiumChart />
                <PaymentRatioChart />
                <PriceDistributionChart />
              </div>
            </section>

            {/* Trader Insights Section */}
            <section className="mb-8">
              <SectionHeader number="03" title="Trader Insights" />
              <div className="space-y-6">
                <UniqueTradersChart />
                <WhaleActivityChart />
                <HoldingPeriodChart />
              </div>
            </section>

            {/* Collection Health Section */}
            <section className="mb-8">
              <SectionHeader number="04" title="Collection Health" />
              <div className="space-y-6">
                <HolderDistributionChart />
                <MarketDepthChart />
              </div>
            </section>

            {/* Recent & Top Sales */}
            <section className="mb-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RecentSales />
                <TopSales />
              </div>
            </section>
          </ChartSettingsProvider>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function SectionHeader({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[11px] font-mono text-brand bg-brand/10 px-2 py-0.5 rounded-md border border-brand/20 uppercase tracking-wider">{number}</span>
      <h2 className="text-3xl font-brice text-gvc-text tracking-tight">{title}</h2>
      <div className="flex-1 h-px bg-gradient-to-r from-gvc-border via-gvc-border/50 to-transparent" />
    </div>
  );
}
