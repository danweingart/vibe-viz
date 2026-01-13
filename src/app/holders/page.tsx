"use client";

import { Header, Footer } from "@/components/layout";
import { HolderDistributionChart } from "@/components/charts";
import { ChartSettingsProvider } from "@/providers/ChartSettingsProvider";
import { ChartControls } from "@/components/dashboard";
import { Card, CardHeader, CardTitle } from "@/components/ui";
import { useCollectionStats } from "@/hooks";
import { formatNumber } from "@/lib/utils";

export default function HoldersPage() {
  const { data: stats } = useCollectionStats();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-brice text-foreground mb-2">
              Holder Analytics
            </h1>
            <p className="text-foreground-muted">
              Distribution and concentration analysis for Good Vibes Club holders
            </p>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Unique Holders"
              value={formatNumber(stats?.numOwners || 0)}
            />
            <StatCard
              label="Total Supply"
              value="10,000"
            />
            <StatCard
              label="Avg per Holder"
              value={stats?.numOwners ? (10000 / stats.numOwners).toFixed(2) : "0"}
            />
            <StatCard
              label="Holder Ratio"
              value={stats?.numOwners ? `${((stats.numOwners / 10000) * 100).toFixed(1)}%` : "0%"}
            />
          </div>

          {/* Main Chart */}
          <ChartSettingsProvider>
            <div className="mb-4">
              <ChartControls />
            </div>
            {/* Centered single chart with max-width for 1:1 tile */}
            <div className="mx-auto max-w-[600px] mb-6">
              <HolderDistributionChart />
            </div>
          </ChartSettingsProvider>

          {/* Info */}
          <Card className="max-w-[600px] mx-auto">
            <CardHeader>
              <CardTitle className="text-sm">About Holder Distribution</CardTitle>
            </CardHeader>
            <div className="text-xs text-foreground-muted space-y-1.5">
              <p>
                Holder distribution shows how NFTs are spread across wallets. A healthy distribution
                typically shows most holders owning 1-5 NFTs, with a smaller percentage of "whales"
                holding larger quantities.
              </p>
              <p>
                <strong>Whale Concentration:</strong> The percentage of total supply held by top holders.
                Lower concentration generally indicates better decentralization.
              </p>
            </div>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background-secondary p-4">
      <p className="text-xs text-foreground-muted uppercase tracking-wide mb-1">{label}</p>
      <p className="text-xl font-bold text-foreground font-brice">{value}</p>
    </div>
  );
}
