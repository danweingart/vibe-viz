"use client";

import { ChartPageLayout } from "@/components/charts/ChartPageLayout";
import { PriceDistributionChart } from "@/components/charts";

export default function PriceDistributionPage() {
  return (
    <ChartPageLayout
      title="Price Distribution"
      description="Distribution of sale prices across price ranges"
    >
      <PriceDistributionChart />
    </ChartPageLayout>
  );
}
