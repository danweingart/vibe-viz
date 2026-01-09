"use client";

import { ChartPageLayout } from "@/components/charts/ChartPageLayout";
import { PriceHistoryChart } from "@/components/charts";

export default function PriceHistoryPage() {
  return (
    <ChartPageLayout
      title="Price History"
      description="Historical average price and volume trends for Good Vibes Club"
    >
      <PriceHistoryChart />
    </ChartPageLayout>
  );
}
