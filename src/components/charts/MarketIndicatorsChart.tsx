"use client";

import { useRef, useMemo, useState } from "react";
import { getChartFilename } from "@/lib/chartExport/index";
import Link from "next/link";
import { Card, CardHeader, CardDescription } from "@/components/ui";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { ChartExportButtons } from "./ChartExportButtons";
import { useMarketIndicators } from "@/hooks";
import { CHART_COLORS } from "@/lib/constants";

// Gauge component for circular progress indicators
function Gauge({
  value,
  max,
  label,
  color,
  size = 175,
}: {
  value: number;
  max: number;
  label: string;
  color: string;
  size?: number;
}) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / max) * circumference;
  const strokeDashoffset = circumference - progress;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#27272a"
            strokeWidth="6"
          />
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
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold" style={{ color }}>{value}</span>
        </div>
      </div>
      <span className="text-xs text-foreground-muted mt-1">{label}</span>
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
  const chartRef = useRef<HTMLDivElement>(null);
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

  if (isLoading) return <ChartSkeleton />;
  if (error || !data) {
    return (
      <Card>
        <CardHeader><span className="text-lg font-bold font-brice">Market Indicators</span></CardHeader>
        <p className="text-foreground-muted text-center py-8">Failed to load indicators</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <Link href="/charts/market-indicators" className="text-lg font-bold text-foreground font-brice hover:text-brand transition-colors">
            Market Indicators
          </Link>
          <p className="export-branding text-sm text-brand font-mundial">Good Vibes Club</p>
          <CardDescription>RSI, momentum & liquidity scores for market sentiment</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <TrendBadge trend={data.priceTrend} type="price" />
          <ChartExportButtons chartRef={chartRef} config={exportConfig} />
        </div>
      </CardHeader>

      <div ref={chartRef} className="px-1 pt-1 bg-background-secondary rounded-lg chart-container flex-1 flex flex-col">
        <div className="flex-1 min-h-[160px] sm:min-h-[280px] flex flex-col">
        {/* Gauges row */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <button
            className="relative flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setExpandedDef(expandedDef === "rsi" ? null : "rsi")}
          >
            <Gauge value={data.rsi} max={100} label="RSI (14D)" color={rsiColor} />
            <span className="text-[10px] text-foreground-muted mt-1">
              {data.rsi > 70 ? "Overbought" : data.rsi < 30 ? "Oversold" : "Neutral"}
            </span>
            <span className="text-[8px] text-brand mt-0.5">Click for info</span>
          </button>

          <button
            className="relative flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
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
            <span className="text-[8px] text-brand mt-0.5">Click for info</span>
          </button>

          <button
            className="relative flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
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
            <span className="text-[8px] text-brand mt-0.5">Click for info</span>
          </button>
        </div>

        {/* Expanded definition */}
        {expandedDef && (
          <div className="bg-background-tertiary rounded-lg p-2 mb-3 text-xs">
            <p className="font-bold text-foreground mb-1">{INDICATOR_DEFS[expandedDef as keyof typeof INDICATOR_DEFS].title}</p>
            <p className="text-foreground-muted leading-relaxed">{INDICATOR_DEFS[expandedDef as keyof typeof INDICATOR_DEFS].desc}</p>
          </div>
        )}

        {/* Info cards */}
        <div className="grid grid-cols-2 gap-3 mt-auto">
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
      </div>
    </Card>
  );
}
