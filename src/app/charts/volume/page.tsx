"use client";

import { ChartPageLayout } from "@/components/charts/ChartPageLayout";
import { VolumeChart } from "@/components/charts";

export default function VolumePage() {
  return (
    <ChartPageLayout
      title="Daily Volume"
      description="Trading volume over the past 30 days"
    >
      <VolumeChart />
    </ChartPageLayout>
  );
}
