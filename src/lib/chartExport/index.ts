// Simplified export module - uses html-to-image for direct DOM capture

export type { ChartExportConfig, LegendItem, StatCardData } from "./types";
export { generatePngDataUrl, downloadFromDataUrl, copyImageToClipboard } from "./simple";

/**
 * Generate a filename for chart exports
 */
export function getChartFilename(chartName: string, timeRange?: number): string {
  const timestamp = Date.now();
  const range = timeRange ? `-${timeRange}d` : "";
  return `gvc-${chartName}${range}-${timestamp}`;
}
