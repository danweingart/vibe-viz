"use client";

import { Header } from "@/components/layout/Header";
import { TokenStatsOverview } from "@/components/vibestr/TokenStatsOverview";
import { TreasuryValuationCard } from "@/components/vibestr/TreasuryValuationCard";
import { NFTTradeFeedCard } from "@/components/vibestr/NFTTradeFeedCard";
import { PriceVolumeChart } from "@/components/vibestr/PriceVolumeChart";
import Link from "next/link";

export default function VibestrPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-sm text-foreground-muted mb-4 sm:mb-6">
          <Link href="/" className="hover:text-brand transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-foreground">VIBESTR Dashboard</span>
        </div>

        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-brice text-3xl sm:text-4xl text-brand mb-2">
                VIBESTR Strategy
              </h1>
              <p className="text-sm sm:text-base text-foreground-muted">
                Real-time analytics for the Good Vibes Club NFT strategy
              </p>
            </div>
          </div>
        </div>

        {/* Stats Overview - 6 Cards */}
        <div className="mb-8">
          <TokenStatsOverview />
        </div>

        {/* Treasury Card */}
        <div className="mb-6 sm:mb-8">
          <TreasuryValuationCard />
        </div>

        {/* NFT Trade Feed & Price Volume Chart - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <NFTTradeFeedCard />
          <PriceVolumeChart />
        </div>
      </main>
    </div>
  );
}
