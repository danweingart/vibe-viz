"use client";

import { useMemo, useState } from "react";
import { getChartFilename } from "@/lib/chartExport/index";
import { StandardChartCard } from "@/components/charts/StandardChartCard";
import { useMarketIndicators } from "@/hooks";
import { CHART_COLORS } from "@/lib/constants";

// Gauge component - responsive size based on container
function Gauge({
  value,
  max,
  label,
  color,
}: {
  value: number;
  max: number;
  label: string;
  color: string;
}) {
  // Use viewBox for responsive SVG that scales with container
  const size = 100; // Internal coordinate system
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / max) * circumference;
  const strokeDashoffset = circumference - progress;

  return (
    <div className="flex flex-col items-center h-full justify-center">
      <div className="relative w-full aspect-square max-w-[140px] sm:max-w-[180px]">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#27272a"
            strokeWidth="6"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        {/* Center value */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg sm:text-2xl font-bold" style={{ color }}>{value}</span>
        </div>
      </div>
      <span className="text-xs text-foreground-muted mt-2">{label}</span>
    </div>
  );
}

// Trend badge component
function TrendBadge({
  trend,
  type,
}: {
  trend: "bullish" | "bearish" | "neutral" | "increasing" | "decreasing" | "stable";
  type: "price" | "volume";
}) {
  const config = {
    bullish: { color: CHART_COLORS.success, icon: "↑", label: "Bullish" },
    bearish: { color: CHART_COLORS.danger, icon: "↓", label: "Bearish" },
    neutral: { color: CHART_COLORS.muted, icon: "→", label: "Neutral" },
    increasing: { color: CHART_COLORS.success, icon: "↑", label: "Rising" },
    decreasing: { color: CHART_COLORS.danger, icon: "↓", label: "Falling" },
    stable: { color: CHART_COLORS.muted, icon: "→", label: "Stable" },
  };

  const { color, icon, label } = config[trend];

  return (
    <div
      className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: `${color}20`, color }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

// Indicator definitions
const INDICATOR_DEFS = {
  rsi: {
    title: "RSI (Relative Strength Index)",
    desc: "Measures price momentum over 14 days. Below 30 = oversold (potential buy), above 70 = overbought (potential sell). Calculated as: 100 - (100 / (1 + avg gains / avg losses)).",
  },
  momentum: {
    title: "Momentum",
    desc: "7-day price change percentage. Positive = prices rising, negative = prices falling. Higher absolute values indicate stronger price movement.",
  },
  liquidity: {
    title: "Liquidity Score",
    desc: "Combined score (0-100) based on: active listings count, sales velocity (trades/day), and bid-ask spread. Higher score = easier to buy/sell at fair prices.",
  },
};

export function MarketIndicatorsChart() {
  const [expandedDef, setExpandedDef] = useState<string | null>(null);
  const { data, isLoading, error } = useMarketIndicators();

  // Determine colors based on data values
  const rsiColor = data
    ? data.rsi > 70
      ? CHART_COLORS.danger // Overbought
      : data.rsi < 30
        ? CHART_COLORS.success // Oversold
        : CHART_COLORS.primary // Neutral
    : CHART_COLORS.primary;

  const momentumColor = data
    ? data.momentum > 10
      ? CHART_COLORS.success
      : data.momentum < -10
        ? CHART_COLORS.danger
        : CHART_COLORS.muted
    : CHART_COLORS.muted;

  const liquidityColor = data
    ? data.liquidityScore > 60
      ? CHART_COLORS.success
      : data.liquidityScore > 30
        ? CHART_COLORS.primary
        : CHART_COLORS.danger
    : CHART_COLORS.primary;

  const exportConfig = useMemo(() => {
    // Use actual data values in export when available
    const rsiLabel = data ? `${data.rsi}` : "N/A";
    const momentumLabel = data ? `${data.momentum > 0 ? "+" : ""}${data.momentum}%` : "N/A";
    const liquidityLabel = data ? `${data.liquidityScore}` : "N/A";

    return {
      title: "Market Indicators",
      subtitle: "RSI, momentum & liquidity scores for market sentiment",
      legend: [
        { color: rsiColor, label: "RSI (14D)", value: rsiLabel },
        { color: momentumColor, label: "Momentum", value: momentumLabel },
        { color: liquidityColor, label: "Liquidity", value: liquidityLabel },
      ],
      filename: getChartFilename("market-indicators"),
    };
  }, [data, rsiColor, momentumColor, liquidityColor]);

  return (
    <StandardChartCard
      title="Market Indicators"
      href="/charts/market-indicators"
      description="Technical indicators for market health assessment"
      badge={data && <TrendBadge trend={data.priceTrend} type="price" />}
      exportConfig={exportConfig}
      isLoading={isLoading}
      error={error}
      isEmpty={!data}
      emptyMessage="Failed to load indicators"
    >
      {data && (
        <div className="h-full flex flex-col">
          {/* Gauges row - takes available space */}
          <div className="flex-1 grid grid-cols-3 gap-2 min-h-0">
            <button
              className="flex flex-col items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setExpandedDef(expandedDef === "rsi" ? null : "rsi")}
            >
              <Gauge value={data.rsi} max={100} label="RSI (14D)" color={rsiColor} />
              <span className="text-[10px] text-foreground-muted mt-1">
                {data.rsi > 70 ? "Overbought" : data.rsi < 30 ? "Oversold" : "Neutral"}
              </span>
              <span className="text-[8px] text-brand mt-0.5 export-hide">Click for info</span>
            </button>

            <button
              className="flex flex-col items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setExpandedDef(expandedDef === "momentum" ? null : "momentum")}
            >
              <Gauge
                value={Math.abs(data.momentum)}
                max={100}
                label="Momentum"
                color={momentumColor}
              />
              <span className="text-[10px] text-foreground-muted mt-1">
                {data.momentum > 0 ? "+" : ""}{data.momentum}%
              </span>
              <span className="text-[8px] text-brand mt-0.5 export-hide">Click for info</span>
            </button>

            <button
              className="flex flex-col items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setExpandedDef(expandedDef === "liquidity" ? null : "liquidity")}
            >
              <Gauge
                value={data.liquidityScore}
                max={100}
                label="Liquidity"
                color={liquidityColor}
              />
              <span className="text-[10px] text-foreground-muted mt-1">
                {data.liquidityScore > 60 ? "High" : data.liquidityScore > 30 ? "Medium" : "Low"}
              </span>
              <span className="text-[8px] text-brand mt-0.5 export-hide">Click for info</span>
            </button>
          </div>

          {/* Expanded definition */}
          {expandedDef && (
            <div className="bg-background-tertiary rounded-lg p-2 my-3 text-xs export-hide shrink-0">
              <p className="font-bold text-foreground mb-1">{INDICATOR_DEFS[expandedDef as keyof typeof INDICATOR_DEFS].title}</p>
              <p className="text-foreground-muted leading-relaxed">{INDICATOR_DEFS[expandedDef as keyof typeof INDICATOR_DEFS].desc}</p>
            </div>
          )}

          {/* Info cards - fixed at bottom */}
          <div className="grid grid-cols-2 gap-3 mt-auto shrink-0">
            <div className="bg-background-tertiary rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-muted">Price Trend</span>
                <TrendBadge trend={data.priceTrend} type="price" />
              </div>
              <p className="text-[10px] text-foreground-muted">
                Based on RSI and price momentum over 14 days
              </p>
            </div>

            <div className="bg-background-tertiary rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-muted">Volume Trend</span>
                <TrendBadge trend={data.volumeTrend} type="volume" />
              </div>
              <p className="text-[10px] text-foreground-muted">
                7-day vs previous 7-day volume comparison
              </p>
            </div>
          </div>
        </div>
      )}
    </StandardChartCard>
  );
}
