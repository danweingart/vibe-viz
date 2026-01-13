/**
 * Simplified export configuration
 * Used for chart export (filename, title only)
 */
export interface ChartExportConfig {
  title: string;
  filename: string;
}

// Legacy types - keep for backward compatibility but unused
export interface StatCardData {
  label: string;
  value: string;
  subValue?: string;
  change?: number;
}

export interface LegendItem {
  color: string;
  label: string;
  value: string;
}
