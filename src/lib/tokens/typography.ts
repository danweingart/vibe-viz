/**
 * GVC Visualization Theme - Typography Tokens
 *
 * Font hierarchy:
 * - Brice Bold: Headings, titles, brand text
 * - Mundial: Body text, labels, values, axes
 */

/** Font families */
export const FONT_FAMILY = {
  heading: 'var(--font-brice), system-ui, sans-serif',
  body: 'var(--font-mundial), system-ui, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, monospace',
} as const;

/** Font size scale (in pixels) */
export const FONT_SIZE = {
  '2xs': 9,   // micro: badges, timestamps
  'xs': 10,   // small: legend labels, axis ticks
  'sm': 11,   // tooltip values, compact text
  'base': 12, // body: tooltip labels, stat labels
  'md': 13,   // descriptions, card descriptions
  'lg': 14,   // larger body: stat subvalues
  'xl': 16,   // titles: card titles
  '2xl': 18,  // large titles
  '3xl': 20,  // stat values
  '4xl': 24,  // export stat values
  '5xl': 28,  // export titles
  '6xl': 32,  // export brand text
} as const;

/** Font weights */
export const FONT_WEIGHT = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

/** Line heights */
export const LINE_HEIGHT = {
  none: 1,
  tight: 1.1,
  snug: 1.25,
  normal: 1.4,
  relaxed: 1.5,
} as const;

/** Semantic text styles combining size, weight, lineHeight, family */
export const TEXT_STYLES = {
  // Headings (Brice Bold)
  cardTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: LINE_HEIGHT.tight,
    fontFamily: FONT_FAMILY.heading,
  },
  exportBrand: {
    fontSize: FONT_SIZE['6xl'],
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: LINE_HEIGHT.none,
    fontFamily: FONT_FAMILY.heading,
  },
  exportTitle: {
    fontSize: FONT_SIZE['5xl'],
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: LINE_HEIGHT.tight,
    fontFamily: FONT_FAMILY.heading,
  },
  sectionTitle: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: LINE_HEIGHT.tight,
    fontFamily: FONT_FAMILY.heading,
  },

  // Body text (Mundial)
  description: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.normal,
    lineHeight: LINE_HEIGHT.normal,
    fontFamily: FONT_FAMILY.body,
  },
  body: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.normal,
    lineHeight: LINE_HEIGHT.normal,
    fontFamily: FONT_FAMILY.body,
  },

  // Stats
  statValue: {
    fontSize: FONT_SIZE['3xl'],
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: LINE_HEIGHT.none,
    fontFamily: FONT_FAMILY.body,
  },
  statValueExport: {
    fontSize: FONT_SIZE['4xl'],
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: LINE_HEIGHT.none,
    fontFamily: FONT_FAMILY.body,
  },
  statLabel: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
    lineHeight: LINE_HEIGHT.normal,
    fontFamily: FONT_FAMILY.body,
  },
  statSubvalue: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.medium,
    lineHeight: LINE_HEIGHT.tight,
    fontFamily: FONT_FAMILY.body,
  },

  // Chart elements
  axisLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.normal,
    lineHeight: LINE_HEIGHT.none,
    fontFamily: FONT_FAMILY.body,
  },
  axisLabelExport: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.normal,
    lineHeight: LINE_HEIGHT.none,
    fontFamily: FONT_FAMILY.body,
  },
  legendLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
    lineHeight: LINE_HEIGHT.tight,
    fontFamily: FONT_FAMILY.body,
  },
  legendValue: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    lineHeight: LINE_HEIGHT.tight,
    fontFamily: FONT_FAMILY.body,
  },

  // Tooltip
  tooltipLabel: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    lineHeight: LINE_HEIGHT.snug,
    fontFamily: FONT_FAMILY.body,
  },
  tooltipValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    lineHeight: LINE_HEIGHT.snug,
    fontFamily: FONT_FAMILY.body,
  },
  tooltipTimestamp: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.normal,
    lineHeight: LINE_HEIGHT.none,
    fontFamily: FONT_FAMILY.mono,
  },

  // Micro text
  badge: {
    fontSize: FONT_SIZE['2xs'],
    fontWeight: FONT_WEIGHT.medium,
    lineHeight: LINE_HEIGHT.none,
    fontFamily: FONT_FAMILY.body,
  },
  caption: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.normal,
    lineHeight: LINE_HEIGHT.normal,
    fontFamily: FONT_FAMILY.body,
  },
} as const;

export type FontSizeKey = keyof typeof FONT_SIZE;
export type TextStyleKey = keyof typeof TEXT_STYLES;
