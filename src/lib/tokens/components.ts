/**
 * GVC Visualization Theme - Component Tokens
 *
 * Specifications for standardized chart components.
 */

import { SPACING, SPACE } from './spacing';
import { TEXT_STYLES, FONT_FAMILY } from './typography';

/** Chart container dimensions and margins */
export const CHART_CONTAINER = {
  // Display dimensions (responsive)
  height: {
    mobile: 280,
    desktop: 360,
    max: 400,
  },

  // Export dimensions (fixed 4:5 portrait for social media)
  export: {
    width: 1080,
    height: 1350,
    chartHeight: 1022,
    chartWidth: 1036,
  },

  // YAxis widths (standardized)
  yAxisWidth: {
    display: {
      default: 40,      // Standard numeric values
      horizontal: 70,   // Category labels (addresses, buckets)
      narrow: 30,       // Integer-only counts
    },
    export: {
      default: 50,
      horizontal: 80,
    },
  },

  // Recharts margins
  margins: {
    display: {
      default: { top: 30, right: 30, left: 0, bottom: 0 },
      horizontal: { top: 30, right: 30, left: 70, bottom: 30 },
    },
    export: {
      default: { top: 40, right: 50, left: 10, bottom: 20 },
      horizontal: { top: 40, right: 50, left: 80, bottom: 40 },
    },
  },

  // Container styling
  borderRadius: 8,
  padding: SPACING.chartPadding,
} as const;

/** Legend component tokens */
export const LEGEND = {
  // Layout
  position: 'top' as const,
  alignment: 'center' as const,
  gap: SPACING.legendGap,

  // Pill styling
  pill: {
    paddingX: SPACING.legendPillPaddingX,
    paddingY: SPACING.legendPillPaddingY,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'var(--border)',
    background: {
      active: 'var(--background-tertiary)',
      inactive: 'transparent',
    },
    opacity: {
      active: 1,
      inactive: 0.5,
    },
  },

  // Dot indicator
  dot: {
    size: {
      sm: 8,
      md: 10,
      lg: 12,
    },
    borderRadius: '50%',
    marginRight: SPACING.legendDotGap,
  },

  // Text
  label: TEXT_STYLES.legendLabel,
  value: TEXT_STYLES.legendValue,
} as const;

/** Tooltip component tokens */
export const TOOLTIP = {
  // Container
  container: {
    minWidth: 140,
    maxWidth: 280,
    padding: SPACING.tooltipPadding,
    borderRadius: 8,
    border: '1px solid var(--border-light)',
    background: 'var(--background-tertiary)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
  },

  // Header (date/label)
  header: {
    ...TEXT_STYLES.tooltipLabel,
    color: 'var(--foreground)',
    marginBottom: SPACING.tooltipLabelGap,
  },

  // Row structure: [dot] [label] [value] [change]
  row: {
    gap: SPACING.tooltipRowGap,
    dotSize: 8,
    dotBorderRadius: 2,
    labelGap: SPACE[3],
  },

  // Label styling
  label: {
    ...TEXT_STYLES.tooltipValue,
    color: 'var(--foreground-muted)',
  },

  // Value styling
  value: {
    ...TEXT_STYLES.tooltipValue,
    fontWeight: 600,
  },

  // Change indicator (% change)
  change: {
    fontSize: 10,
    fontWeight: 500,
    positive: 'var(--chart-success)',
    negative: 'var(--chart-danger)',
    marginLeft: SPACE[2],
  },

  // Timestamp
  timestamp: {
    ...TEXT_STYLES.tooltipTimestamp,
    color: 'var(--foreground-subtle)',
    marginTop: SPACE[2],
  },
} as const;

/** Chart header component tokens */
export const CHART_HEADER = {
  // Spacing
  marginBottom: SPACING.headerGap,

  // Title
  title: {
    ...TEXT_STYLES.cardTitle,
    color: 'var(--foreground)',
  },

  // Description
  description: {
    ...TEXT_STYLES.description,
    color: 'var(--foreground-muted)',
    marginTop: SPACE[1],
  },

  // Controls area
  controls: {
    gap: SPACE[2],
  },
} as const;

/** Context/info panel component tokens */
export const CONTEXT_PANEL = {
  // Container
  container: {
    padding: SPACING.chartPadding,
    borderRadius: 8,
    background: 'var(--background-tertiary)',
    border: '1px solid var(--border)',
    marginBottom: SPACING.sectionGap,
  },

  // Title (if present)
  title: {
    ...TEXT_STYLES.statLabel,
    marginBottom: SPACE[2],
  },

  // Content
  content: TEXT_STYLES.description,
} as const;

/** Stat card component tokens */
export const STAT_CARD = {
  // Display
  display: {
    padding: SPACING.statPadding,
    borderRadius: 12,
    gap: SPACING.statLabelGap,
    label: TEXT_STYLES.statLabel,
    value: TEXT_STYLES.statValue,
    subValue: TEXT_STYLES.statSubvalue,
  },

  // Export
  export: {
    padding: 16,
    borderRadius: 12,
    labelFontSize: 13,
    valueFontSize: 24,
    subValueFontSize: 12,
    gap: 12,
  },
} as const;

/** Axis styling tokens */
export const AXIS = {
  display: {
    stroke: '#71717a',
    fontSize: TEXT_STYLES.axisLabel.fontSize,
    fontFamily: FONT_FAMILY.body,
    axisLine: false,
    tickLine: false,
  },
  export: {
    stroke: '#71717a',
    fontSize: TEXT_STYLES.axisLabelExport.fontSize,
    fontFamily: FONT_FAMILY.body,
    axisLine: false,
    tickLine: false,
  },
} as const;

/** Grid styling tokens */
export const GRID = {
  stroke: '#27272a',
  strokeDasharray: '3 3',
  vertical: false,
} as const;

/** Active dot styling */
export const ACTIVE_DOT = {
  r: 5,
  strokeWidth: 2,
  stroke: '#0a0a0a',
} as const;

/** Area gradient opacity */
export const AREA_GRADIENT = {
  startOpacity: 0.3,
  endOpacity: 0,
} as const;
