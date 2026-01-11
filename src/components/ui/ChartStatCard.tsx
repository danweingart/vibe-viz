"use client";

import { ReactNode } from "react";

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
    ? change >= 0 ? "↑" : "↓"
    : "";

  return (
    <div className={`p-4 rounded-xl border border-border bg-background-secondary ${className}`}>
      <div className="flex items-center gap-1.5 text-sm text-foreground-muted mb-2">
        <span className="font-medium">{label}</span>
        {icon}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-foreground">{value}</span>
        {subValue !== undefined && (
          <span className="text-base text-foreground-muted">/ {subValue}</span>
        )}
        {change !== undefined && (
          <span className={`text-base font-medium ${changeColor}`}>
            {changeArrow} {Math.abs(change).toFixed(0)}%
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
    <div className={`grid ${gridCols[columns]} gap-3 mt-4`}>
      {children}
    </div>
  );
}
