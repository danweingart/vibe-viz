"use client";

import { ChartPageLayout } from "@/components/charts/ChartPageLayout";
import { SalesVelocityChart } from "@/components/charts";

export default function SalesVelocityPage() {
  return (
    <ChartPageLayout
      title="Sales Velocity"
      description="Daily sales count with rolling 7-day average"
    >
      <SalesVelocityChart />
    </ChartPageLayout>
  );
}
