// Centralized chart styling constants for visual consistency across all charts

export const CHART_MARGINS = {
  default: { top: 8, right: 12, left: 0, bottom: 0 },
  horizontal: { top: 8, right: 8, left: 70, bottom: 8 },
} as const;

// Export-specific margins (larger to prevent text cutoff)
export const EXPORT_MARGINS = {
  default: { top: 20, right: 30, left: 10, bottom: 20 },
  horizontal: { top: 20, right: 30, left: 80, bottom: 20 },
} as const;

export const AXIS_STYLE = {
  stroke: "#71717a",
  fontSize: 11,
  fontFamily: "var(--font-mundial)",
  axisLine: false,
  tickLine: false,
} as const;

// Export-specific axis style (larger text for readability)
export const EXPORT_AXIS_STYLE = {
  stroke: "#71717a",
  fontSize: 16,
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
    height: 130,          // Reduced for more chart space
    brandText: "Good Vibes Club",
    brandFontSize: 50,    // Slightly reduced for tighter fit
    titleFontSize: 30,    // Chart title size
    subtitleFontSize: 20, // Chart subtitle/description size
    padding: 20,          // Horizontal padding
    gap: 8,               // Gap between text lines
  },
  legendBar: {
    height: 48,           // Reduced - pill buttons need less height
    itemFontSize: 13,     // Legend label size
    valueFontSize: 14,    // Legend value size
    dotSize: 8,           // Color indicator dot diameter
    gap: 6,               // Gap between dot and label
    pillPadding: { h: 14, v: 6 }, // Pill button padding (horizontal, vertical)
    pillRadius: 16,       // Fully rounded pill
    pillGap: 12,          // Gap between pills
  },
  chartArea: {
    topMargin: 178,       // header + legend bar (reduced)
    bottomMargin: 8,      // Minimal bottom margin
    sideMargin: 8,        // Minimal side margins
  },
  statCards: {
    height: 90,           // Reduced height
    cardHeight: 68,       // Individual card height
    padding: 16,          // Reduced padding around cards
    labelFontSize: 13,    // Label text size
    valueFontSize: 24,    // Value text size
    subValueFontSize: 12, // Sub-value text size
    gap: 12,              // Gap between cards
    borderRadius: 16,     // More rounded (matches rounded-xl)
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
