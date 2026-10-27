"use client";

import { Header, Footer } from "@/components/layout";
import { PageHero } from "@/components/ui";
import { RoyaltiesSection } from "@/components/dashboard/RoyaltiesSection";
import { ChartSettingsProvider } from "@/providers/ChartSettingsProvider";

export default function RoyaltiesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-grid-pattern">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8">
        <PageHero title="Good Vibes Club">Secondary-sale royalty reporting</PageHero>
        <ChartSettingsProvider><RoyaltiesSection /></ChartSettingsProvider>
      </main>
      <Footer dataSource="Royalty receipts and historical exchange rates from verified imported records." />
    </div>
  );
}
