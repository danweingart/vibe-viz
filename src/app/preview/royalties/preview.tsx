"use client";

import { useState } from "react";
import { RoyaltiesView } from "@/components/dashboard/RoyaltiesSection";
import { PageHero, ToggleButtonGroup } from "@/components/ui";
import { ChartSettingsProvider } from "@/providers/ChartSettingsProvider";
import { buildRoyaltyHistory, monthKey, monthStart, offsetMonth } from "@/lib/royalties/history";

// Deliberately synthetic, fixed figures for layout/interactivity review only.
const now = new Date("2026-10-26T12:00:00.000Z");
const amounts = [9.4, 12.8, 15.6, 11.2, 19.7, 23.4, 17.9, 21.6, 26.8, 18.3, 24.7, 28.1, 32.6, 18.4];
const rows = amounts.map((eth, i) => {
  const month = offsetMonth(monthKey(now), i - 13);
  return { month, eth: String(eth), usd: String(eth * (2400 + i * 85)), paymentCount: 90 + i * 11,
    unpricedCount: 0, complete: true,
    coveredThrough: i === 13 ? now.toISOString() : monthStart(offsetMonth(month, 1)), updatedAt: now.toISOString() };
});

export function RoyaltyPreview() {
  const [mode, setMode] = useState<"sample" | "pending" | "partial">("sample");
  const data = buildRoyaltyHistory(mode === "pending" ? [] : mode === "partial" ? rows.slice(8) : rows, now);
  return <main className="min-h-screen bg-grid-pattern px-4 sm:px-6 lg:px-8 py-8">
    <div className="mx-auto max-w-[1600px]">
      <div className="flex flex-wrap gap-3 items-center justify-between mb-8">
        <span className="text-brand text-xs uppercase tracking-widest">Local development preview</span>
        <ToggleButtonGroup options={[{ value: "sample", label: "Sample data" }, { value: "partial", label: "Partial backfill" }, { value: "pending", label: "Awaiting data" }]} value={mode} onChange={setMode} />
      </div>
      <PageHero title="Good Vibes Club">Royalty reporting · same dashboard components, ready for verified historical data</PageHero>
      <ChartSettingsProvider><RoyaltiesView data={data} sample /></ChartSettingsProvider>
    </div>
  </main>;
}
