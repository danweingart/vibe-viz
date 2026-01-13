"use client";

import { ReactNode } from "react";
import { EXPORT_BRANDING } from "@/lib/chartConfig";

// Export dimensions (1:1 square for social media)
export const EXPORT_WIDTH = 1080;
export const EXPORT_HEIGHT = 1080;

// Layout heights for 1:1 square - more compact to fit everything
const HEADER_HEIGHT = 100;
const LEGEND_HEIGHT = 44;
const STAT_CARDS_HEIGHT = 80;
const BORDER_WIDTH = 2;
const PADDING = 16;

// Chart area = total - header - legend - stat cards - borders - padding
export const CHART_HEIGHT = EXPORT_HEIGHT - HEADER_HEIGHT - LEGEND_HEIGHT - STAT_CARDS_HEIGHT - BORDER_WIDTH * 2 - PADDING * 2;
export const CHART_WIDTH = EXPORT_WIDTH - BORDER_WIDTH * 2 - PADDING * 2;

// Explicit colors for export (CSS variables don't always work with html-to-image)
const COLORS = {
  background: "#0a0a0a",
  backgroundSecondary: "#141414",
  foreground: "#fafafa",
  foregroundMuted: "#a1a1aa",
  brand: "#ffe048",
  border: "#27272a",
  success: "#34d399",
  danger: "#f87171",
};

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
 * ExportTemplate - 1:1 square branded container for PNG exports
 *
 * Uses explicit inline styles (not CSS variables) to ensure html-to-image captures colors correctly.
 * All spacing and typography aligned with EXPORT_BRANDING tokens.
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
        backgroundColor: COLORS.background,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        color: COLORS.foreground,
        fontFamily: "var(--font-mundial), system-ui, sans-serif",
      }}
    >
      {/* Thin border on left, right, bottom (not top - header extends to edge) */}
      <div
        style={{
          position: "absolute",
          top: HEADER_HEIGHT,
          left: 0,
          right: 0,
          bottom: 0,
          border: `${BORDER_WIDTH}px solid ${COLORS.border}`,
          borderTop: "none",
          pointerEvents: "none",
        }}
      />

      {/* Header Section - Text only, no logo */}
      <div
        style={{
          height: HEADER_HEIGHT,
          backgroundColor: COLORS.background,
          borderBottom: `1px solid ${COLORS.border}`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingLeft: PADDING + 8,
          paddingRight: PADDING + 8,
        }}
      >
        <div
          style={{
            fontSize: 36,
            lineHeight: 1,
            color: COLORS.brand,
            fontFamily: "var(--font-brice), system-ui, sans-serif",
            fontWeight: "bold",
          }}
        >
          Good Vibes Club
        </div>
        <h2
          style={{
            fontSize: 28,
            lineHeight: 1.1,
            color: COLORS.foreground,
            fontFamily: "var(--font-brice), system-ui, sans-serif",
            fontWeight: "bold",
            marginTop: 6,
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            style={{
              fontSize: 16,
              color: COLORS.foregroundMuted,
              marginTop: 4,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Legend Bar */}
      <div
        style={{
          height: LEGEND_HEIGHT,
          marginLeft: BORDER_WIDTH,
          marginRight: BORDER_WIDTH,
          display: "flex",
          alignItems: "center",
          gap: 8,
          paddingLeft: PADDING,
          paddingRight: PADDING,
        }}
      >
        {legend.map((item, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              paddingLeft: 10,
              paddingRight: 10,
              paddingTop: 4,
              paddingBottom: 4,
              borderRadius: 9999,
              border: `1px solid ${COLORS.border}`,
              backgroundColor: COLORS.backgroundSecondary,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: item.color,
              }}
            />
            <span style={{ fontSize: 11, color: COLORS.foregroundMuted }}>
              {item.label}:
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: item.color,
              }}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>

      {/* Chart Area */}
      <div
        style={{
          flex: 1,
          paddingLeft: BORDER_WIDTH + PADDING,
          paddingRight: BORDER_WIDTH + PADDING,
          paddingTop: PADDING / 2,
          paddingBottom: PADDING / 2,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            backgroundColor: COLORS.backgroundSecondary,
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {children}
        </div>
      </div>

      {/* Stat Cards */}
      {statCards && statCards.length > 0 && (
        <div
          style={{
            height: STAT_CARDS_HEIGHT,
            paddingLeft: BORDER_WIDTH + PADDING,
            paddingRight: BORDER_WIDTH + PADDING,
            paddingBottom: BORDER_WIDTH + PADDING,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(statCards.length, 4)}, 1fr)`,
              gap: 8,
              height: "100%",
            }}
          >
            {statCards.slice(0, 4).map((card, index) => (
              <ExportStatCard
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

// Inline stat card component for export (doesn't rely on CSS variables)
function ExportStatCard({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change?: number;
}) {
  return (
    <div
      style={{
        padding: 10,
        borderRadius: 10,
        border: `1px solid ${COLORS.border}`,
        backgroundColor: COLORS.backgroundSecondary,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: COLORS.foregroundMuted,
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span
          style={{
            fontSize: 18,
            fontWeight: "bold",
            color: COLORS.foreground,
          }}
        >
          {value}
        </span>
        {change !== undefined && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: change >= 0 ? COLORS.success : COLORS.danger,
            }}
          >
            {change >= 0 ? "+" : ""}{change.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}
