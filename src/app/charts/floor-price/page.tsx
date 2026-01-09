"use client";

import { ChartPageLayout } from "@/components/charts/ChartPageLayout";
import { FloorPriceChart } from "@/components/charts";

export default function FloorPricePage() {
  return (
    <ChartPageLayout
      title="Floor Price Tracker"
      description="Daily minimum sale price with 7-day moving average"
    >
      <FloorPriceChart />
    </ChartPageLayout>
  );
}
