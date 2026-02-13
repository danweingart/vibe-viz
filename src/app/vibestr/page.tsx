/**
 * VIBESTR Strategy Dashboard
 *
 * REMOVED CHARTS (awaiting historical data accumulation):
 *
 * These charts require historical price/volume/liquidity data that
 * is not available from any API. They will be reinstated once we
 * accumulate 30+ days of daily snapshots from the cron job.
 *
 * Removed from Section 01 - Burn Tracking & Supply:
 * - TokenPriceChart (requires historical token price)
 * - TradingVolumeChart (requires historical 24h volume)
 *
 * Removed from Section 02 - NFT Holdings & Treasury:
 * - PriceVsFloorChart (requires historical token price)
 * - LiquidityDepthChart (requires historical liquidity depth)
 *
 * Removed Section 03 - Performance & Market:
 * - TokenVolatilityChart (requires historical price for volatility)
 * - CumulativeTradingVolumeChart (requires historical volume)
 * - ProfitLossDistributionChart (requires historical buy/sell prices)
 * - TokenHealthIndicatorsChart (requires volume/liquidity metrics)
 *
 * Data Source: NFTStrategy API provides current snapshots only.
 * Blockchain events cannot provide historical price/volume/liquidity.
 *
 * To reinstate: Uncomment imports and chart components after 30+ days
 * of daily snapshot collection via Vercel cron job.
 */
"use client";

import { Footer } from "@/components/layout/Footer";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { TokenStatsOverview } from "@/components/vibestr/TokenStatsOverview";
import { ChartControls } from "@/components/dashboard/ChartControls";
import { ChartSettingsProvider } from "@/providers/ChartSettingsProvider";
import {
  // Section 01: Burn Tracking & NFT Holdings
  BurnMetricsChart,
  BurnProgressChart,
  HoldingsBreakdownChart,
  HoldingsValueChart,
  // Section 02: Trader & Holder Activity
  DailyActiveTradersChart,
  HolderActivityChart,
  TokenHolderDistributionChart,
  AverageHoldTimeChart,
  // COMMENTED OUT - Awaiting historical data:
  // TokenPriceChart,
  // TradingVolumeChart,
  // PriceVsFloorChart,
  // LiquidityDepthChart,
  // TokenVolatilityChart,
  // ProfitLossDistributionChart,
  // TokenHealthIndicatorsChart,
  // CumulativeTradingVolumeChart,
} from "@/components/charts/vibestr";

export default function VibestrPage() {
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
                VIBESTR Strategy
                <div className="absolute inset-0 blur-[40px] bg-brand/20 animate-glow-pulse -z-10" />
              </h1>
              <p className="text-gvc-text-muted text-base sm:text-lg max-w-xl">
                Real-time analytics and market insights for the{" "}
                <span className="text-brand font-medium">Good Vibes Club</span>{" "}
                token strategy
              </p>
            </div>
          </div>

          <ChartSettingsProvider>
            {/* Stats Overview */}
            <section className="mb-8">
              <TokenStatsOverview />
            </section>

            {/* Universal Chart Controls */}
            <section className="mb-6">
              <ChartControls />
            </section>

            {/* Section 01: Burn Tracking & NFT Holdings */}
            <section className="mb-8">
              <SectionHeader number="01" title="Burn Tracking & NFT Holdings" />
              <div className="space-y-6">
                <BurnMetricsChart />
                <BurnProgressChart />
                <HoldingsBreakdownChart />
                <HoldingsValueChart />
              </div>
            </section>

            {/* Section 02: Trader & Holder Activity */}
            <section className="mb-8">
              <SectionHeader number="02" title="Trader & Holder Activity" />
              <div className="space-y-6">
                <DailyActiveTradersChart />
                <HolderActivityChart />
                <TokenHolderDistributionChart />
                <AverageHoldTimeChart />
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
      <span className="text-[11px] font-mono text-brand bg-brand/10 px-2 py-0.5 rounded-md border border-brand/20 uppercase tracking-wider">
        {number}
      </span>
      <h2 className="text-3xl font-brice text-gvc-text tracking-tight">{title}</h2>
      <div className="flex-1 h-px bg-gradient-to-r from-gvc-border via-gvc-border/50 to-transparent" />
    </div>
  );
}
