"use client";

import { useState, useEffect } from "react";
import { Header, Footer } from "@/components/layout";
import { StatsOverview, RecentSales, TopSales, ChartControls } from "@/components/dashboard";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { SectionHeader, PageHero } from "@/components/ui";
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

      <Header
        lastUpdated={stats?.lastUpdated}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <main className="flex-1 relative z-10">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8">
          {/* Hero Section */}
          <PageHero title="Good Vibes Club">
            Real-time analytics and market insights for the <span className="text-brand font-medium">Good Vibes Club</span> NFT collection on Ethereum
          </PageHero>

          {/* Chart Controls & Charts wrapped in provider */}
          <ChartSettingsProvider>
            {/* Stats Overview */}
            <section className="mb-8">
              <StatsOverview />
            </section>

            {/* Universal Chart Controls - sticky below header */}
            <section className="mb-6 sticky top-16 z-40">
              <ChartControls />
            </section>

            {/* Price & Volume Section */}
            <section className="mb-8">
              <SectionHeader number="01" title="Price & Volume" id="section-price" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PriceHistoryChart />
                <SalesVolumeChart />
                <PriceVolatilityChart />
                <CumulativeVolumeChart />
              </div>
            </section>

            {/* Market Analysis Section */}
            <section className="mb-8">
              <SectionHeader number="02" title="Market Analysis" id="section-market" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CollectorsPremiumChart />
                <PaymentRatioChart />
                <PriceDistributionChart />
              </div>
            </section>

            {/* Trader Insights Section */}
            <section className="mb-8">
              <SectionHeader number="03" title="Trader Insights" id="section-traders" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <UniqueTradersChart />
                <WhaleActivityChart />
                <HoldingPeriodChart />
              </div>
            </section>

            {/* Collection Health Section */}
            <section className="mb-8">
              <SectionHeader number="04" title="Collection Health" id="section-health" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
      <BackToTop />
    </div>
  );
}

function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 800);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full bg-gvc-card border border-gvc-border backdrop-blur-md flex items-center justify-center text-gvc-text-muted hover:text-brand hover:border-brand/50 transition-all shadow-lg"
      aria-label="Back to top"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    </button>
  );
}
