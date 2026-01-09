"use client";

import { ChartPageLayout } from "@/components/charts/ChartPageLayout";
import { PaymentRatioChart } from "@/components/charts";

export default function PaymentRatioPage() {
  return (
    <ChartPageLayout
      title="ETH vs WETH Sales"
      description="Payment method breakdown for recent sales"
    >
      <PaymentRatioChart />
    </ChartPageLayout>
  );
}
