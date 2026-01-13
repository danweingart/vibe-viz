"use client";

import { ChartPageLayout } from "@/components/charts/ChartPageLayout";
import { CollectorsPremiumChart } from "@/components/charts";
import { Card } from "@/components/ui";

export default function CollectorsPremiumPage() {
  return (
    <ChartPageLayout
      title="Collector's Premium"
      description="Percentage of sales above the daily floor price"
    >
      <div className="space-y-4">
        <CollectorsPremiumChart />

        <Card className="p-4">
          <h3 className="font-brice text-foreground text-sm mb-2">Understanding Collector's Premium</h3>
          <div className="text-xs text-foreground-muted space-y-1.5">
            <p>
              <strong className="text-foreground">What it measures:</strong> The percentage of daily sales
              that occur above the floor price (minimum sale price) for that day.
            </p>
            <p>
              <strong className="text-foreground">≥10% Premium:</strong> Sales at least 10% above floor -
              indicates basic demand beyond floor sweeping.
            </p>
            <p>
              <strong className="text-foreground">≥25% Premium:</strong> Sales at least 25% above floor -
              suggests collectors paying for specific traits or rarity.
            </p>
            <p>
              <strong className="text-foreground">≥50% Premium:</strong> Sales at least 50% above floor -
              indicates strong demand for rare or highly desired pieces.
            </p>
          </div>
        </Card>
      </div>
    </ChartPageLayout>
  );
}
