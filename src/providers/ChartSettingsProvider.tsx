"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type TimeRange = 7 | 30 | 90;
export type Currency = "eth" | "usd";

interface ChartSettings {
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
}

const ChartSettingsContext = createContext<ChartSettings | null>(null);

export function ChartSettingsProvider({ children }: { children: ReactNode }) {
  const [timeRange, setTimeRange] = useState<TimeRange>(30);
  const [currency, setCurrency] = useState<Currency>("eth");

  return (
    <ChartSettingsContext.Provider
      value={{ timeRange, setTimeRange, currency, setCurrency }}
    >
      {children}
    </ChartSettingsContext.Provider>
  );
}

export function useChartSettings() {
  const context = useContext(ChartSettingsContext);
  if (!context) {
    throw new Error("useChartSettings must be used within ChartSettingsProvider");
  }
  return context;
}
