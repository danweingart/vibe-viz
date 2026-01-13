"use client";

import { LEGEND, SPACING } from "@/lib/tokens";

export interface LegendItem {
  key: string;
  label: string;
  color: string;
  active?: boolean;
  value?: string;
  lineStyle?: "dot" | "solid" | "dashed"; // Indicator style
}

export interface ChartLegendProps {
  items: LegendItem[];
  onToggle?: (key: string) => void;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Standardized chart legend component
 *
 * Features:
 * - Top-positioned, horizontally centered
 * - Pill-style buttons with color dot + label
 * - Optional value display
 * - Toggle support for interactive charts
 * - Uses GVC design tokens for consistent spacing
 */
export function ChartLegend({
  items,
  onToggle,
  size = "md",
  className = "",
}: ChartLegendProps) {
  const dotSize = LEGEND.dot.size[size];
  const isInteractive = !!onToggle;

  return (
    <div
      className={`flex items-center justify-center flex-wrap ${className}`}
      style={{ gap: LEGEND.gap }}
    >
      {items.map((item) => {
        const isActive = item.active !== false;

        return (
          <button
            key={item.key}
            onClick={() => onToggle?.(item.key)}
            disabled={!isInteractive}
            type="button"
            className={`
              flex items-center border border-border rounded-full
              transition-all duration-150
              ${isActive ? "bg-background-tertiary" : "opacity-50"}
              ${isInteractive ? "hover:bg-background-tertiary cursor-pointer" : "cursor-default"}
            `}
            style={{
              paddingLeft: LEGEND.pill.paddingX,
              paddingRight: LEGEND.pill.paddingX,
              paddingTop: LEGEND.pill.paddingY,
              paddingBottom: LEGEND.pill.paddingY,
              gap: LEGEND.dot.marginRight,
            }}
          >
            {/* Color indicator - dot, solid line, or dashed line */}
            {item.lineStyle === "dashed" ? (
              <span
                className="flex-shrink-0 rounded"
                style={{
                  width: 16,
                  height: 2,
                  backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 2px, ${item.color} 2px, ${item.color} 4px)`,
                }}
              />
            ) : item.lineStyle === "solid" ? (
              <span
                className="flex-shrink-0 rounded"
                style={{
                  width: 16,
                  height: 2,
                  backgroundColor: item.color,
                }}
              />
            ) : (
              <span
                className="rounded-full flex-shrink-0"
                style={{
                  width: dotSize,
                  height: dotSize,
                  backgroundColor: item.color,
                }}
              />
            )}

            {/* Label */}
            <span
              className="font-mundial text-foreground whitespace-nowrap"
              style={{
                fontSize: LEGEND.label.fontSize,
                fontWeight: LEGEND.label.fontWeight,
              }}
            >
              {item.label}
            </span>

            {/* Optional value */}
            {item.value && (
              <span
                className="font-mundial text-foreground-muted whitespace-nowrap"
                style={{
                  fontSize: LEGEND.value.fontSize,
                  fontWeight: LEGEND.value.fontWeight,
                  marginLeft: SPACING.legendDotGap,
                }}
              >
                {item.value}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default ChartLegend;
