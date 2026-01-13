/**
 * Chart Configuration
 *
 * Centralized chart styling constants for visual consistency across all charts.
 * This file re-exports tokens from the design system and provides Recharts-compatible helpers.
 *
 * @see src/lib/tokens/ for the full token system
 */

import {
  SPACING,
  CHART_CONTAINER,
  LEGEND,
  TOOLTIP,
  AXIS,
  GRID,
  ACTIVE_DOT,
  AREA_GRADIENT,
  TEXT_STYLES,
  FONT_FAMILY,
} from './tokens';

// Re-export tokens for backward compatibility
export {
  SPACING,
  CHART_CONTAINER,
  LEGEND,
  TOOLTIP,
  TEXT_STYLES,
  FONT_FAMILY,
} from './tokens';

/** Recharts margins for display */
export const CHART_MARGINS = CHART_CONTAINER.margins.display;

/** Recharts margins for export (larger to prevent text cutoff) */
export const EXPORT_MARGINS = CHART_CONTAINER.margins.export;

/** Axis styling for display */
export const AXIS_STYLE = {
  stroke: AXIS.display.stroke,
  fontSize: AXIS.display.fontSize,
  fontFamily: AXIS.display.fontFamily,
  axisLine: AXIS.display.axisLine,
  tickLine: AXIS.display.tickLine,
} as const;

/** Axis styling for export (larger text for readability) */
export const EXPORT_AXIS_STYLE = {
  stroke: AXIS.export.stroke,
  fontSize: AXIS.export.fontSize,
  fontFamily: AXIS.export.fontFamily,
  axisLine: AXIS.export.axisLine,
  tickLine: AXIS.export.tickLine,
} as const;

/** Grid styling */
export const GRID_STYLE = {
  stroke: GRID.stroke,
  strokeDasharray: GRID.strokeDasharray,
  vertical: GRID.vertical,
} as const;

/** Tooltip container styling */
export const TOOLTIP_STYLE = {
  backgroundColor: '#141414',
  border: TOOLTIP.container.border,
  borderRadius: `${TOOLTIP.container.borderRadius}px`,
  boxShadow: TOOLTIP.container.boxShadow,
  padding: `${SPACING.tooltipPadding}px ${SPACING.tooltipPadding + 4}px`,
} as const;

/** Active dot styling */
export const ACTIVE_DOT_STYLE = {
  r: ACTIVE_DOT.r,
  strokeWidth: ACTIVE_DOT.strokeWidth,
  stroke: ACTIVE_DOT.stroke,
} as const;

/** Gradient opacity for area charts */
export { AREA_GRADIENT } from './tokens';

/** Chart sizing - separate display vs export dimensions */
export const CHART_SIZE = {
  display: {
    minHeight: CHART_CONTAINER.height.mobile,
    desktopHeight: CHART_CONTAINER.height.desktop,
    maxHeight: CHART_CONTAINER.height.max,
  },
  export: {
    width: CHART_CONTAINER.export.width,
    height: CHART_CONTAINER.export.height,
    aspectRatio: CHART_CONTAINER.export.width / CHART_CONTAINER.export.height,
    scale: 2,
  },
} as const;

/**
 * @deprecated Use CHART_SIZE instead
 */
export const CHART_HEIGHT = {
  dashboard: 320,
  export: {
    canvas: { width: CHART_SIZE.export.width, height: CHART_SIZE.export.height },
    chartArea: 0.62,
  },
} as const;

/** Typography sizes (compact) */
export const CHART_TYPOGRAPHY = {
  title: TEXT_STYLES.cardTitle.fontSize,
  description: TEXT_STYLES.description.fontSize,
  statValue: TEXT_STYLES.statValue.fontSize,
  statLabel: TEXT_STYLES.statLabel.fontSize,
  axis: TEXT_STYLES.axisLabel.fontSize,
  legend: TEXT_STYLES.legendLabel.fontSize,
  tooltipLabel: TEXT_STYLES.tooltipLabel.fontSize,
  tooltipValue: TEXT_STYLES.tooltipValue.fontSize,
} as const;

/** Padding (compact) */
export const CHART_PADDING = {
  header: SPACING.cardPadding,
  body: SPACING.chartPadding,
  stats: SPACING.statPadding,
  statCard: SPACING.statPadding,
  gap: SPACING.sectionGap,
} as const;

/** Export-specific styling */
export const EXPORT_STYLE = {
  brandFrame: 16,
  borderRadius: 16,
  header: {
    logoSize: 56,
    titleSize: 22,
    subtitleSize: 14,
    padding: '24px 28px 20px',
  },
  stats: {
    valueSize: 36,
    labelSize: 14,
    padding: 20,
  },
  footer: {
    fontSize: 28,
    padding: '20px 28px',
  },
} as const;

/** Export branding configuration (shown ONLY in export, hidden on screen) */
export const EXPORT_BRANDING = {
  header: {
    height: 130,
    logoSize: 56,
    brandText: 'Good Vibes Club',
    brandFontSize: 50,
    titleFontSize: 30,
    subtitleFontSize: 20,
    padding: 20,
    gap: 8,
  },
  legendBar: {
    height: 48,
    itemFontSize: TEXT_STYLES.legendLabel.fontSize + 3, // 13px
    valueFontSize: TEXT_STYLES.legendValue.fontSize + 4, // 14px
    dotSize: LEGEND.dot.size.sm, // 8px
    gap: 6,
    pillPadding: { h: 14, v: 6 },
    pillRadius: 16,
    pillGap: 12,
  },
  chartArea: {
    topMargin: 178,
    bottomMargin: 8,
    sideMargin: 8,
  },
  statCards: {
    height: 90,
    cardHeight: 68,
    padding: 16,
    labelFontSize: 13,
    valueFontSize: 24,
    subValueFontSize: 12,
    gap: 12,
    borderRadius: 16,
  },
} as const;

/** State styling for loading, empty, error states */
export const STATE_STYLE = {
  skeleton: {
    backgroundColor: '#27272a',
    shimmerColor: '#3f3f46',
    animationDuration: '1.5s',
    borderRadius: '8px',
  },
  empty: {
    iconSize: 48,
    iconColor: '#71717a',
    messageFontSize: 14,
    messageColor: '#a1a1aa',
  },
  error: {
    iconSize: 48,
    iconColor: '#f87171',
    messageFontSize: 14,
    messageColor: '#a1a1aa',
    retryButtonColor: '#ffe048',
  },
} as const;

// ===== RECHARTS-COMPATIBLE HELPERS =====

/** Recharts-compatible axis props helper */
export const getAxisProps = () => ({
  stroke: AXIS_STYLE.stroke,
  fontSize: AXIS_STYLE.fontSize,
  fontFamily: AXIS_STYLE.fontFamily,
  axisLine: AXIS_STYLE.axisLine,
  tickLine: AXIS_STYLE.tickLine,
});

/** Recharts-compatible export axis props helper */
export const getExportAxisProps = () => ({
  stroke: EXPORT_AXIS_STYLE.stroke,
  fontSize: EXPORT_AXIS_STYLE.fontSize,
  fontFamily: EXPORT_AXIS_STYLE.fontFamily,
  axisLine: EXPORT_AXIS_STYLE.axisLine,
  tickLine: EXPORT_AXIS_STYLE.tickLine,
});

/** Recharts-compatible grid props helper */
export const getGridProps = () => ({
  strokeDasharray: GRID_STYLE.strokeDasharray,
  stroke: GRID_STYLE.stroke,
  vertical: GRID_STYLE.vertical,
});

/** Recharts-compatible tooltip content style helper */
export const getTooltipContentStyle = () => ({
  backgroundColor: TOOLTIP_STYLE.backgroundColor,
  border: TOOLTIP_STYLE.border,
  borderRadius: TOOLTIP_STYLE.borderRadius,
  boxShadow: TOOLTIP_STYLE.boxShadow,
});

/** Get standardized YAxis width for display */
export const getYAxisWidth = (layout: 'default' | 'horizontal' = 'default') =>
  CHART_CONTAINER.yAxisWidth.display[layout];

/** Get standardized YAxis width for export */
export const getExportYAxisWidth = (layout: 'default' | 'horizontal' = 'default') =>
  CHART_CONTAINER.yAxisWidth.export[layout];
