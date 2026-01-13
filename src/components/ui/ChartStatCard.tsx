"use client";

import { ReactNode } from "react";
import { SPACING, TEXT_STYLES } from "@/lib/tokens";

interface ChartStatCardProps {
  label: string;
  value: string | number;
  subValue?: string | number;
  change?: number; // Percentage change (positive or negative)
  icon?: ReactNode;
  className?: string;
}

export function ChartStatCard({
  label,
  value,
  subValue,
  change,
  icon,
  className = "",
}: ChartStatCardProps) {
  const changeColor = change !== undefined
    ? change >= 0 ? "text-chart-success" : "text-chart-danger"
    : "";

  const changeArrow = change !== undefined
    ? change >= 0 ? "+" : ""
    : "";

  return (
    <div
      className={`rounded-xl border border-border bg-background-secondary text-center ${className}`}
      style={{ padding: SPACING.statPadding }}
    >
      <div
        className="flex items-center justify-center text-foreground-muted"
        style={{
          gap: SPACING.statLabelGap,
          fontSize: TEXT_STYLES.statLabel.fontSize,
          fontWeight: TEXT_STYLES.statLabel.fontWeight,
          marginBottom: SPACING.statLabelGap,
        }}
      >
        <span>{label}</span>
        {icon}
      </div>
      <div
        className="flex items-baseline justify-center"
        style={{ gap: SPACING.legendGap }}
      >
        <span
          className="font-bold text-foreground"
          style={{
            fontSize: TEXT_STYLES.statValue.fontSize,
            lineHeight: TEXT_STYLES.statValue.lineHeight,
          }}
        >
          {value}
        </span>
        {subValue !== undefined && (
          <span
            className="text-foreground-muted"
            style={{
              fontSize: TEXT_STYLES.statSubvalue.fontSize,
            }}
          >
            / {subValue}
          </span>
        )}
        {change !== undefined && (
          <span
            className={`font-medium ${changeColor}`}
            style={{
              fontSize: TEXT_STYLES.statSubvalue.fontSize,
            }}
          >
            {changeArrow}{change.toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
}

interface ChartStatGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
}

export function ChartStatGrid({ children, columns = 2 }: ChartStatGridProps) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
  };

  return (
    <div
      className={`grid ${gridCols[columns]}`}
      style={{
        gap: SPACING.statGridGap,
        marginTop: SPACING.statLabelGap,
      }}
    >
      {children}
    </div>
  );
}
