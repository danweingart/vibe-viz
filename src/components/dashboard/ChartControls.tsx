"use client";

import { useChartSettings, TimeRange, Currency } from "@/providers/ChartSettingsProvider";

export function ChartControls() {
  const { timeRange, setTimeRange, currency, setCurrency } = useChartSettings();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-2xl border border-border bg-background-secondary/80 backdrop-blur-sm">
      <div className="flex items-center justify-center sm:justify-start gap-3">
        <span className="text-xs text-foreground-subtle uppercase tracking-wider font-medium hidden sm:inline">Time Range</span>
        <div className="flex gap-1.5 p-1 rounded-full bg-background-tertiary border border-border/50">
          {([7, 30, 90] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 active:scale-95 ${
                timeRange === range
                  ? "bg-brand text-background shadow-sm shadow-brand/20"
                  : "text-foreground-muted hover:text-foreground hover:bg-border/30"
              }`}
            >
              {range}D
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center sm:justify-end gap-3">
        <span className="text-xs text-foreground-subtle uppercase tracking-wider font-medium hidden sm:inline">Currency</span>
        <div className="flex gap-1.5 p-1 rounded-full bg-background-tertiary border border-border/50">
          {(["eth", "usd"] as Currency[]).map((curr) => (
            <button
              key={curr}
              onClick={() => setCurrency(curr)}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 active:scale-95 ${
                currency === curr
                  ? "bg-brand text-background shadow-sm shadow-brand/20"
                  : "text-foreground-muted hover:text-foreground hover:bg-border/30"
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
