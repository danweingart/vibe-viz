export interface StatCardData {
  label: string;
  value: string;
  subValue?: string;
  change?: number;
}

export interface ChartExportConfig {
  title: string;
  subtitle: string;
  legend: LegendItem[];
  filename: string;
  statCards?: StatCardData[];
}

export interface LegendItem {
  color: string;
  label: string;
  value: string;
}

// Canvas dimensions for social media (4:5 portrait)
export const EXPORT_WIDTH = 1080;
export const EXPORT_HEIGHT = 1350;

// Layout constants - optimized for maximum chart space
export const HEADER_HEIGHT = 130;      // Reduced from 140
export const LEGEND_HEIGHT = 48;       // Reduced from 55, pill buttons need less height
export const STAT_CARDS_HEIGHT = 90;   // Reduced from 100
export const CHART_TOP = HEADER_HEIGHT + LEGEND_HEIGHT; // 178px
export const CHART_MARGIN = 8;         // Reduced from 10 for tighter fit

// Colors
export const COLORS = {
  background: "#0a0a0a",
  legendBar: "#0a0a0a",            // Match background (no bar bg)
  pillBackground: "#18181b",       // Pill button background (zinc-900)
  pillBorder: "#27272a",           // Pill button border (zinc-800)
  brand: "#ffe048",
  foreground: "#fafafa",
  foregroundMuted: "#a1a1aa",
  divider: "#3f3f46",
  cardBackground: "#18181b",       // Match pill (zinc-900)
  cardBorder: "#27272a",           // zinc-800
  success: "#22c55e",
  danger: "#ef4444",
} as const;
