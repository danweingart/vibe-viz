"use client";

import { useChartSettings, TimeRange, Currency } from "@/providers/ChartSettingsProvider";

export function ChartControls() {
  const { timeRange, setTimeRange, currency, setCurrency } = useChartSettings();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 rounded-xl border border-border bg-background-secondary">
      <div className="flex items-center justify-center sm:justify-start gap-2">
        <span className="text-sm text-foreground-muted hidden sm:inline">Time Range:</span>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {([7, 30, 90] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2.5 sm:py-2 text-sm font-medium transition-colors ${
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

      <div className="flex items-center justify-center sm:justify-end gap-2">
        <span className="text-sm text-foreground-muted hidden sm:inline">Currency:</span>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(["eth", "usd"] as Currency[]).map((curr) => (
            <button
              key={curr}
              onClick={() => setCurrency(curr)}
              className={`px-4 py-2.5 sm:py-2 text-sm font-medium transition-colors ${
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
