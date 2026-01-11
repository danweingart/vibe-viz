export interface ChartExportConfig {
  title: string;
  subtitle: string;
  legend: LegendItem[];
  filename: string;
}

export interface LegendItem {
  color: string;
  label: string;
  value: string;
}

// Canvas dimensions for social media (4:5 portrait)
export const EXPORT_WIDTH = 1080;
export const EXPORT_HEIGHT = 1350;

// Layout constants
export const HEADER_HEIGHT = 105;
export const LEGEND_HEIGHT = 55;
export const CHART_TOP = HEADER_HEIGHT + LEGEND_HEIGHT; // 160px
export const CHART_MARGIN = 10;

// Colors
export const COLORS = {
  background: "#0a0a0a",
  legendBar: "#1a1a1a",
  brand: "#ffe048",
  foreground: "#fafafa",
  foregroundMuted: "#a1a1aa",
  divider: "#3f3f46",
} as const;
