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
              flex items-center gap-2 px-3 py-1.5 rounded-lg border
              transition-all duration-150
              ${isActive ? "border-gvc-border bg-gvc-card/50" : "border-gvc-border/30 bg-gvc-card/20 opacity-50"}
              ${isInteractive ? "hover:border-gvc-border-hover cursor-pointer" : "cursor-default"}
            `}
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
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
            )}

            {/* Label */}
            <span className="text-xs font-mundial text-gvc-text uppercase tracking-wider whitespace-nowrap">
              {item.label}
            </span>

            {/* Optional value */}
            {item.value && (
              <span
                className="font-mundial text-gvc-text-muted whitespace-nowrap"
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
