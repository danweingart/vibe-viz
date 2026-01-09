"use client";

import { useChartSettings, TimeRange, Currency } from "@/providers/ChartSettingsProvider";

export function ChartControls() {
  const { timeRange, setTimeRange, currency, setCurrency } = useChartSettings();

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-border bg-background-secondary">
      <div className="flex items-center gap-2">
        <span className="text-sm text-foreground-muted">Time Range:</span>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {([7, 30, 90] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                timeRange === range
                  ? "bg-brand text-background"
                  : "text-foreground-muted hover:text-foreground hover:bg-border"
              }`}
            >
              {range}D
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-foreground-muted">Currency:</span>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(["eth", "usd"] as Currency[]).map((curr) => (
            <button
              key={curr}
              onClick={() => setCurrency(curr)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                currency === curr
                  ? "bg-brand text-background"
                  : "text-foreground-muted hover:text-foreground hover:bg-border"
              }`}
            >
              {curr.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
