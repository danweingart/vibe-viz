// Centralized chart styling constants for visual consistency across all charts

export const CHART_MARGINS = {
  default: { top: 8, right: 12, left: 0, bottom: 0 },
  horizontal: { top: 8, right: 8, left: 70, bottom: 8 },
} as const;

export const AXIS_STYLE = {
  stroke: "#71717a",
  fontSize: 11,
  fontFamily: "var(--font-mundial)",
  axisLine: false,
  tickLine: false,
} as const;

export const GRID_STYLE = {
  stroke: "#27272a",
  strokeDasharray: "3 3",
  vertical: false,
} as const;

export const TOOLTIP_STYLE = {
  backgroundColor: "#141414",
  border: "1px solid #27272a",
  borderRadius: "8px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
  padding: "8px 12px",
} as const;

export const ACTIVE_DOT_STYLE = {
  r: 5,
  strokeWidth: 2,
  stroke: "#0a0a0a",
} as const;

// Gradient opacity for area charts
export const AREA_GRADIENT = {
  startOpacity: 0.3,
  endOpacity: 0,
} as const;

// Chart sizing - separate display vs export dimensions
export const CHART_SIZE = {
  // On-screen display (responsive, optimized for dashboard)
  display: {
    minHeight: 320,      // Mobile minimum
    desktopHeight: 400,  // Desktop comfortable height
    maxHeight: 500,      // Maximum on large screens
  },

  // Export dimensions (fixed 4:5 portrait for social media)
  export: {
    width: 1080,
    height: 1350,
    aspectRatio: 1080 / 1350, // 4:5 portrait
    scale: 2, // 2x for retina displays
  },
} as const;

// Legacy alias for backward compatibility
export const CHART_HEIGHT = {
  dashboard: 320, // Deprecated - use CHART_SIZE instead
  export: {
    canvas: { width: CHART_SIZE.export.width, height: CHART_SIZE.export.height },
    chartArea: 0.62, // 62% of card for chart
  },
} as const;

// Typography sizes (compact)
export const CHART_TYPOGRAPHY = {
  title: 16,        // Reduced from 18px
  description: 13,  // Reduced from 14px
  statValue: 18,    // Reduced from 20px
  statLabel: 11,    // Reduced from 12px
  axis: 11,         // Standardized
  legend: 10,
  tooltipLabel: 12,
  tooltipValue: 11,
} as const;

// Padding (compact)
export const CHART_PADDING = {
  header: 12,       // Reduced from 16px
  body: 12,         // Reduced from 16px
  stats: 12,        // Reduced from 16px
  statCard: 12,     // Reduced from 16px
  gap: 10,          // Grid gap
} as const;

// Export-specific styling
export const EXPORT_STYLE = {
  brandFrame: 16,   // Yellow border padding
  borderRadius: 16,
  header: {
    logoSize: 56,
    titleSize: 22,
    subtitleSize: 14,
    padding: "24px 28px 20px",
  },
  stats: {
    valueSize: 36,
    labelSize: 14,
    padding: 20,
  },
  footer: {
    fontSize: 28,
    padding: "20px 28px",
  },
} as const;

// Export branding configuration (shown ONLY in export, hidden on screen)
export const EXPORT_BRANDING = {
  header: {
    height: 120,          // Total header height including padding
    logoSize: 48,         // Logo dimensions (square)
    logoPath: "/images/shaka.png",
    brandText: "Good Vibes Club",
    brandFontSize: 36,    // "Good Vibes Club" text size
    titleFontSize: 22,    // Chart title size
    subtitleFontSize: 16, // Chart subtitle/description size
    padding: 24,          // Horizontal padding
    gap: 16,              // Gap between logo and text
  },
  legendBar: {
    height: 55,           // Legend bar height
    itemFontSize: 14,     // Legend label size
    valueFontSize: 16,    // Legend value size
    dotSize: 10,          // Color indicator dot diameter
    gap: 8,               // Gap between dot and label
  },
  chartArea: {
    topMargin: 175,       // header + legend bar
    bottomMargin: 24,
    sideMargin: 24,
  },
} as const;

// State styling for loading, empty, error states
export const STATE_STYLE = {
  skeleton: {
    backgroundColor: "#27272a",
    shimmerColor: "#3f3f46",
    animationDuration: "1.5s",
    borderRadius: "8px",
  },
  empty: {
    iconSize: 48,
    iconColor: "#71717a",
    messageFontSize: 14,
    messageColor: "#a1a1aa",
  },
  error: {
    iconSize: 48,
    iconColor: "#f87171",
    messageFontSize: 14,
    messageColor: "#a1a1aa",
    retryButtonColor: "#ffe048",
  },
} as const;

// Recharts-compatible axis props helper
export const getAxisProps = () => ({
  stroke: AXIS_STYLE.stroke,
  fontSize: AXIS_STYLE.fontSize,
  fontFamily: AXIS_STYLE.fontFamily,
  axisLine: AXIS_STYLE.axisLine,
  tickLine: AXIS_STYLE.tickLine,
});

// Recharts-compatible grid props helper
export const getGridProps = () => ({
  strokeDasharray: GRID_STYLE.strokeDasharray,
  stroke: GRID_STYLE.stroke,
  vertical: GRID_STYLE.vertical,
});

// Recharts-compatible tooltip content style helper
export const getTooltipContentStyle = () => ({
  backgroundColor: TOOLTIP_STYLE.backgroundColor,
  border: TOOLTIP_STYLE.border,
  borderRadius: TOOLTIP_STYLE.borderRadius,
  boxShadow: TOOLTIP_STYLE.boxShadow,
});
