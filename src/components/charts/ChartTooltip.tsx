"use client";

import { CHART_COLORS } from "@/lib/constants";
import { TOOLTIP_STYLE, CHART_TYPOGRAPHY } from "@/lib/chartConfig";

export type TooltipColorKey = "primary" | "info" | "success" | "danger" | "accent" | "muted";

const colorMap: Record<TooltipColorKey, string> = {
  primary: CHART_COLORS.primary,
  info: CHART_COLORS.info,
  success: CHART_COLORS.success,
  danger: CHART_COLORS.danger,
  accent: CHART_COLORS.accent,
  muted: CHART_COLORS.muted,
};

export interface TooltipRow {
  label: string;
  value: string | number;
  color?: TooltipColorKey;
}

interface ChartTooltipProps {
  active?: boolean;
  label?: string;
  rows?: TooltipRow[];
  labelFormatter?: (label: string) => string;
}

export function ChartTooltip({
  active,
  label,
  rows = [],
  labelFormatter,
}: ChartTooltipProps) {
  if (!active || rows.length === 0) return null;

  const displayLabel = labelFormatter && label ? labelFormatter(label) : label;

  return (
    <div
      className="chart-tooltip"
      style={{
        backgroundColor: TOOLTIP_STYLE.backgroundColor,
        border: TOOLTIP_STYLE.border,
        borderRadius: TOOLTIP_STYLE.borderRadius,
        boxShadow: TOOLTIP_STYLE.boxShadow,
        padding: TOOLTIP_STYLE.padding,
        minWidth: "160px",
      }}
    >
      {displayLabel && (
        <div
          style={{
            fontSize: CHART_TYPOGRAPHY.tooltipLabel,
            fontWeight: 600,
            color: "#fafafa",
            marginBottom: rows.length > 0 ? "8px" : 0,
          }}
        >
          {displayLabel}
        </div>
      )}
      {rows.map((row, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: CHART_TYPOGRAPHY.tooltipValue,
            marginBottom: index < rows.length - 1 ? "4px" : 0,
          }}
        >
          <span
            style={{
              color: "#a1a1aa",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {row.color && (
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "2px",
                  backgroundColor: colorMap[row.color],
                  flexShrink: 0,
                }}
              />
            )}
            {row.label}
          </span>
          <span
            style={{
              fontWeight: 600,
              color: row.color ? colorMap[row.color] : "#fafafa",
            }}
          >
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// Helper to create Recharts-compatible tooltip content
interface RechartsTooltipPayload {
  name?: string;
  value?: number | string;
  dataKey?: string;
  color?: string;
  payload?: Record<string, unknown>;
}

interface CustomTooltipContentProps {
  active?: boolean;
  payload?: RechartsTooltipPayload[];
  label?: string;
  labelFormatter?: (label: string) => string;
  valueFormatter?: (value: number | string, dataKey: string) => string;
  colorMapping?: Record<string, TooltipColorKey>;
  labelMapping?: Record<string, string>;
}

export function CustomTooltipContent({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
  colorMapping = {},
  labelMapping = {},
}: CustomTooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;

  const rows: TooltipRow[] = payload.map((item) => {
    const dataKey = item.dataKey as string;
    const displayLabel = labelMapping[dataKey] || item.name || dataKey;
    const displayValue = valueFormatter
      ? valueFormatter(item.value as number | string, dataKey)
      : String(item.value);
    const color = colorMapping[dataKey];

    return {
      label: displayLabel,
      value: displayValue,
      color,
    };
  });

  return (
    <ChartTooltip
      active={active}
      label={label}
      rows={rows}
      labelFormatter={labelFormatter}
    />
  );
}
