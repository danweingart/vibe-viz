"use client";

import { ChartPageLayout } from "@/components/charts/ChartPageLayout";
import { HolderDistributionChart } from "@/components/charts";

export default function HolderDistributionPage() {
  return (
    <ChartPageLayout
      title="Holder Distribution"
      description="How NFTs are distributed across wallets"
    >
      <HolderDistributionChart />
    </ChartPageLayout>
  );
}
