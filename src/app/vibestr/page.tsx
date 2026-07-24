"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { SectionHeader, PageHero } from "@/components/ui";
import { TokenStatsOverview } from "@/components/vibestr/TokenStatsOverview";
import { ChartControls } from "@/components/dashboard/ChartControls";
import { ChartSettingsProvider } from "@/providers/ChartSettingsProvider";
import {
  TokenPriceChart,
  MarketCapChart,
  BuySellPressureChart,
  PriceVsFloorChart,
  NFTTradeHistoryChart,
  TreasuryFeesChart,
} from "@/components/charts/vibestr";

export default function VibestrPage() {
  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Floating particles effect */}
      <FloatingParticles count={40} />

      {/* Grid pattern background */}
      <div className="fixed inset-0 bg-grid-pattern opacity-100 pointer-events-none z-0" />

      {/* Header */}
      <Header />

      <main className="flex-1 relative z-10">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8">
          {/* Hero Section */}
          <PageHero title="VIBESTR Strategy">
            Real-time analytics for the{" "}
            <span className="text-brand font-medium">Good Vibes Club</span>{" "}
            strategy token — powered by DexScreener & CoinGecko
          </PageHero>

          <ChartSettingsProvider>
            {/* Stats Overview */}
            <section className="mb-8">
              <TokenStatsOverview />
            </section>

            {/* Chart Controls */}
            <section className="mb-6 sticky top-16 z-40">
              <ChartControls />
            </section>

            {/* Section 01: Token Overview */}
            <section className="mb-8" id="section-overview">
              <SectionHeader number="01" title="Token Overview" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TokenPriceChart />
                <MarketCapChart />
              </div>
            </section>

            {/* Section 02: Trading Activity */}
            <section className="mb-8" id="section-trading">
              <SectionHeader number="02" title="Trading Activity" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <BuySellPressureChart />
                <PriceVsFloorChart />
              </div>
            </section>

            {/* Section 03: Strategy Mechanics */}
            <section className="mb-8" id="section-strategy">
              <SectionHeader number="03" title="Strategy Mechanics" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TreasuryFeesChart />
                <NFTTradeHistoryChart />
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
