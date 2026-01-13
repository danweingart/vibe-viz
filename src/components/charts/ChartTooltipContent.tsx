"use client";

import { TOOLTIP, SPACING, TEXT_STYLES } from "@/lib/tokens";

export interface TooltipRow {
  label: string;
  value: string;
  color?: string;
  change?: number; // Percentage change (positive or negative)
}

export interface ChartTooltipContentProps {
  /** Header text (usually date/time) */
  header?: string;
  /** Data rows to display */
  rows: TooltipRow[];
  /** Optional timestamp at bottom */
  timestamp?: string;
  /** Optional className for container */
  className?: string;
}

/**
 * Rich chart tooltip content component
 *
 * Structure:
 * - Header: date/label (12px semibold)
 * - Rows: [dot] [label] [value] [% change]
 * - Timestamp at bottom (10px muted)
 *
 * Uses GVC design tokens for consistent styling.
 */
export function ChartTooltipContent({
  header,
  rows,
  timestamp,
  className = "",
}: ChartTooltipContentProps) {
  return (
    <div
      className={`font-mundial ${className}`}
      style={{
        minWidth: TOOLTIP.container.minWidth,
        maxWidth: TOOLTIP.container.maxWidth,
        padding: TOOLTIP.container.padding,
        borderRadius: TOOLTIP.container.borderRadius,
        background: "var(--background-tertiary)",
        border: TOOLTIP.container.border,
        boxShadow: TOOLTIP.container.boxShadow,
      }}
    >
      {/* Header */}
      {header && (
        <div
          style={{
            fontSize: TOOLTIP.header.fontSize,
            fontWeight: TOOLTIP.header.fontWeight,
            color: "var(--foreground)",
            marginBottom: rows.length > 0 ? TOOLTIP.header.marginBottom : 0,
          }}
        >
          {header}
        </div>
      )}

      {/* Rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: TOOLTIP.row.gap }}>
        {rows.map((row, index) => (
          <div
            key={index}
            className="flex items-center justify-between"
            style={{ gap: TOOLTIP.row.labelGap }}
          >
            {/* Left side: dot + label */}
            <div className="flex items-center" style={{ gap: TOOLTIP.row.labelGap }}>
              {row.color && (
                <span
                  style={{
                    width: TOOLTIP.row.dotSize,
                    height: TOOLTIP.row.dotSize,
                    borderRadius: TOOLTIP.row.dotBorderRadius,
                    backgroundColor: row.color,
                    flexShrink: 0,
                  }}
                />
              )}
              <span
                style={{
                  fontSize: TOOLTIP.label.fontSize,
                  fontWeight: TOOLTIP.label.fontWeight,
                  color: "var(--foreground-muted)",
                }}
              >
                {row.label}
              </span>
            </div>

            {/* Right side: value + change */}
            <div className="flex items-center" style={{ gap: TOOLTIP.change.marginLeft }}>
              <span
                style={{
                  fontSize: TOOLTIP.value.fontSize,
                  fontWeight: TOOLTIP.value.fontWeight,
                  color: row.color || "var(--foreground)",
                }}
              >
                {row.value}
              </span>

              {row.change !== undefined && row.change !== 0 && (
                <span
                  style={{
                    fontSize: TOOLTIP.change.fontSize,
                    fontWeight: TOOLTIP.change.fontWeight,
                    color: row.change > 0
                      ? "var(--chart-success)"
                      : "var(--chart-danger)",
                  }}
                >
                  {row.change > 0 ? "+" : ""}{row.change.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Timestamp */}
      {timestamp && (
        <div
          style={{
            fontSize: TOOLTIP.timestamp.fontSize,
            fontWeight: TOOLTIP.timestamp.fontWeight,
            color: "var(--foreground-subtle)",
            marginTop: SPACING.tooltipRowGap * 2,
            fontFamily: TEXT_STYLES.tooltipTimestamp.fontFamily,
          }}
        >
          {timestamp}
        </div>
      )}
    </div>
  );
}

/**
 * Custom Recharts tooltip wrapper
 *
 * Use this as the `content` prop for Recharts Tooltip component.
 */
export interface RechartsTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color?: string;
    dataKey: string;
    payload?: Record<string, unknown>;
  }>;
  label?: string;
  formatValue?: (value: number, dataKey: string) => string;
  formatLabel?: (label: string) => string;
  getChange?: (dataKey: string, payload: Record<string, unknown>) => number | undefined;
}

export function RechartsTooltip({
  active,
  payload,
  label,
  formatValue = (v) => v.toLocaleString(),
  formatLabel = (l) => l,
  getChange,
}: RechartsTooltipProps) {
  if (!active || !payload?.length) return null;

  const rows: TooltipRow[] = payload.map((entry) => ({
    label: entry.name,
    value: formatValue(entry.value, entry.dataKey),
    color: entry.color,
    change: getChange ? getChange(entry.dataKey, entry.payload || {}) : undefined,
  }));

  return (
    <ChartTooltipContent
      header={label ? formatLabel(label) : undefined}
      rows={rows}
    />
  );
}

export default ChartTooltipContent;
