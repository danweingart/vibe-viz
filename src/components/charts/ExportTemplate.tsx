"use client";

import { ReactNode } from "react";
import { ChartStatCard } from "@/components/ui/ChartStatCard";

// Export dimensions (4:5 portrait for social media)
export const EXPORT_WIDTH = 1080;
export const EXPORT_HEIGHT = 1350;

// Layout heights
const HEADER_HEIGHT = 130;
const LEGEND_HEIGHT = 60;
const STAT_CARDS_HEIGHT = 120;
const PADDING = 24;

// Chart area = total - header - legend - stat cards - padding
export const CHART_HEIGHT = EXPORT_HEIGHT - HEADER_HEIGHT - LEGEND_HEIGHT - STAT_CARDS_HEIGHT - PADDING * 2;
export const CHART_WIDTH = EXPORT_WIDTH - PADDING * 2;

export interface LegendItem {
  color: string;
  label: string;
  value: string;
}

export interface StatCardData {
  label: string;
  value: string;
  change?: number;
}

interface ExportTemplateProps {
  title: string;
  subtitle: string;
  legend: LegendItem[];
  statCards?: StatCardData[];
  children: ReactNode; // Chart visualization
}

/**
 * ExportTemplate - A styled container for PNG exports
 *
 * Renders at fixed 1080x1350 dimensions with:
 * - Branding header (Good Vibes Club + title + subtitle)
 * - Legend pills
 * - Chart visualization (children)
 * - Stat cards at bottom
 *
 * Uses actual Tailwind classes so exports match front-end styling exactly.
 */
export function ExportTemplate({
  title,
  subtitle,
  legend,
  statCards,
  children,
}: ExportTemplateProps) {
  return (
    <div
      style={{
        width: EXPORT_WIDTH,
        height: EXPORT_HEIGHT,
        backgroundColor: "#0a0a0a",
      }}
      className="flex flex-col text-foreground"
    >
      {/* Header Section */}
      <div
        className="flex flex-col items-center justify-center pt-6 pb-4"
        style={{ height: HEADER_HEIGHT }}
      >
        {/* Brand name */}
        <span
          className="font-brice text-brand"
          style={{ fontSize: 48 }}
        >
          Good Vibes Club
        </span>
        {/* Chart title */}
        <h2
          className="font-brice text-foreground mt-1"
          style={{ fontSize: 28 }}
        >
          {title}
        </h2>
        {/* Subtitle */}
        <p
          className="font-mundial text-foreground-muted mt-1"
          style={{ fontSize: 18 }}
        >
          {subtitle}
        </p>
      </div>

      {/* Legend Bar */}
      <div
        className="flex items-center justify-center gap-4 px-6"
        style={{ height: LEGEND_HEIGHT }}
      >
        {legend.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-background-secondary"
          >
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-foreground-muted font-mundial text-sm">
              {item.label}:
            </span>
            <span
              className="font-mundial font-semibold text-sm"
              style={{ color: item.color }}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>

      {/* Chart Area */}
      <div
        className="flex-1 px-6"
        style={{ height: CHART_HEIGHT }}
      >
        <div className="w-full h-full bg-background-secondary rounded-lg overflow-hidden">
          {children}
        </div>
      </div>

      {/* Stat Cards */}
      {statCards && statCards.length > 0 && (
        <div
          className="px-6 pb-6 pt-4"
          style={{ height: STAT_CARDS_HEIGHT }}
        >
          <div className={`grid gap-4 h-full ${statCards.length === 2 ? 'grid-cols-2' : statCards.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
            {statCards.map((card, index) => (
              <ChartStatCard
                key={index}
                label={card.label}
                value={card.value}
                change={card.change}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
