/**
 * GVC Visualization Theme - Spacing Tokens
 *
 * Ultra-tight spacing system with 8px base unit.
 * - 4px for tight/dense areas (legend internals)
 * - 8px for base spacing (dense areas)
 * - 12px for containers (cards, chart areas)
 */

/** Primitive spacing scale (in pixels) */
export const SPACE = {
  0: 0,
  1: 2,   // micro (dot-to-label gaps)
  2: 4,   // tight (legend internal, tooltip rows)
  3: 6,   // compact
  4: 8,   // base/dense (standard gaps)
  6: 12,  // containers (card padding, chart area)
  8: 16,  // comfortable (stat cards)
  10: 20, // export padding
  12: 24, // section spacing
  16: 32, // large gaps (export header)
} as const;

/** Semantic spacing tokens for specific contexts */
export const SPACING = {
  // Card spacing
  cardPadding: SPACE[6],           // 12px - card internal padding
  cardPaddingMobile: SPACE[4],     // 8px - mobile card padding
  cardGap: SPACE[4],               // 8px - gap between card sections

  // Chart container spacing
  chartPadding: SPACE[6],          // 12px - chart area padding
  chartMarginTop: SPACE[4],        // 8px - recharts top margin
  chartMarginRight: SPACE[4],      // 8px - recharts right margin
  chartMarginBottom: 0,            // 0px - no bottom margin
  chartMarginLeft: 0,              // 0px - controlled by YAxis width

  // Legend spacing (ultra-tight)
  legendGap: SPACE[2],             // 4px - between legend items
  legendPillPaddingX: SPACE[4],    // 8px - horizontal pill padding
  legendPillPaddingY: SPACE[2],    // 4px - vertical pill padding
  legendDotGap: SPACE[2],          // 4px - between dot and label

  // Tooltip spacing (compact)
  tooltipPadding: SPACE[4],        // 8px - tooltip internal padding
  tooltipRowGap: SPACE[2],         // 4px - between tooltip rows
  tooltipLabelGap: SPACE[4],       // 8px - between label and content

  // Stats spacing
  statPadding: SPACE[6],           // 12px - stat card padding
  statGridGap: SPACE[4],           // 8px - between stat cards
  statLabelGap: SPACE[1],          // 2px - between label and value

  // Section spacing
  sectionGap: SPACE[4],            // 8px - between major sections
  headerGap: SPACE[4],             // 8px - header to content gap

  // Export-specific (scaled up)
  exportPadding: SPACE[10],        // 20px - export canvas padding
  exportHeaderPadding: SPACE[16],  // 32px - export header padding
} as const;

/** CSS variable mapping for Tailwind/CSS usage */
export const SPACING_VARS = {
  '--space-0': '0px',
  '--space-1': '2px',
  '--space-2': '4px',
  '--space-3': '6px',
  '--space-4': '8px',
  '--space-6': '12px',
  '--space-8': '16px',
  '--space-10': '20px',
  '--space-12': '24px',
  '--space-16': '32px',

  // Semantic
  '--card-padding': '12px',
  '--chart-padding': '12px',
  '--legend-gap': '4px',
  '--tooltip-padding': '8px',
  '--stat-padding': '12px',
  '--section-gap': '8px',
} as const;

export type SpaceKey = keyof typeof SPACE;
export type SpacingKey = keyof typeof SPACING;
