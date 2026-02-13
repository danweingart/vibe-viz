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

/** Axis styling for display */
export const AXIS_STYLE = {
  stroke: AXIS.display.stroke,
  fontSize: AXIS.display.fontSize,
  fontFamily: AXIS.display.fontFamily,
  axisLine: AXIS.display.axisLine,
  tickLine: AXIS.display.tickLine,
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

/**
 * Get consistent X-axis tick count for time-series charts
 * This ensures all charts show the same date labels regardless of data length
 */
export const getXAxisTickCount = () => 7;

/**
 * Generate evenly spaced tick values for X-axis alignment across charts
 * This ensures consistent date labels by explicitly selecting which dates to show
 * @param dates - Array of date strings from chart data
 * @param count - Number of ticks to show (default: 6)
 * @returns Array of evenly spaced date strings to use as ticks
 */
export function getAlignedTicks(dates: string[], count: number = 6): string[] {
  if (dates.length <= count) return dates;
  const step = (dates.length - 1) / (count - 1);
  return Array.from({ length: count }, (_, i) => dates[Math.round(i * step)]);
}
