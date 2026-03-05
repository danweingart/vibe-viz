"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
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
          <div className="mb-8 relative">
            <div className="absolute -top-8 -left-4 w-64 h-32 bg-brand/5 blur-3xl rounded-full pointer-events-none" />

            <div className="relative">
              <h1 className="text-5xl font-brice text-brand mb-3 tracking-tight glowing-text relative inline-block">
                VIBESTR Strategy
                <div className="absolute inset-0 blur-[40px] bg-brand/20 animate-glow-pulse -z-10" />
              </h1>
              <p className="text-gvc-text-muted text-base sm:text-lg max-w-xl">
                Real-time analytics for the{" "}
                <span className="text-brand font-medium">Good Vibes Club</span>{" "}
                strategy token — powered by DexScreener & CoinGecko
              </p>
            </div>
          </div>

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

function SectionHeader({ number, title, id }: { number: string; title: string; id?: string }) {
  return (
    <div id={id} className="flex items-center gap-3 mb-4 sticky top-[120px] z-30 py-2 -mx-1 px-1 bg-gvc-bg/80 backdrop-blur-md">
      <span className="text-[11px] font-mono text-brand bg-brand/10 px-2 py-0.5 rounded-md border border-brand/20 uppercase tracking-wider">
        {number}
      </span>
      <h2 className="text-3xl font-brice text-gvc-text tracking-tight">{title}</h2>
      <div className="flex-1 h-px bg-gradient-to-r from-gvc-border via-gvc-border/50 to-transparent" />
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
