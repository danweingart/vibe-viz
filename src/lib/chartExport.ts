import { toPng } from "html-to-image";

// X/Twitter optimal image dimensions (16:9 aspect ratio)
export const X_IMAGE_WIDTH = 1200;
export const X_IMAGE_HEIGHT = 675;
const BACKGROUND_COLOR = "#0a0a0a";

interface ExportOptions {
  filename: string;
}

/**
 * Export a chart element as a PNG optimized for X/Twitter sharing.
 * Captures the element as-is and scales to 1200x675.
 * Adds 'exporting' class during capture to show export-only elements.
 */
export async function exportChartForX(
  element: HTMLElement,
  options: ExportOptions
): Promise<void> {
  const { filename } = options;

  // Add 'exporting' class to show export-only branding elements
  element.classList.add("exporting");

  // Store original styles and set export dimensions for 16:9 aspect ratio
  const originalWidth = element.style.width;
  const originalHeight = element.style.height;
  const originalMinHeight = element.style.minHeight;
  const originalMaxHeight = element.style.maxHeight;
  const originalOverflow = element.style.overflow;
  const originalPadding = element.style.padding;
  const originalMargin = element.style.margin;
  const originalBorderRadius = element.style.borderRadius;

  // Set element to exact 16:9 dimensions for capture with no padding/margin
  element.style.width = "1200px";
  element.style.height = "675px";
  element.style.minHeight = "675px";
  element.style.maxHeight = "675px";
  element.style.overflow = "hidden";
  element.style.padding = "0";
  element.style.margin = "0";
  element.style.borderRadius = "0";

  // Capture the chart element at high resolution
  const chartDataUrl = await toPng(element, {
    backgroundColor: BACKGROUND_COLOR,
    pixelRatio: 2,
    width: 1200,
    height: 675,
  });

  // Restore original styles
  element.style.width = originalWidth;
  element.style.height = originalHeight;
  element.style.minHeight = originalMinHeight;
  element.style.maxHeight = originalMaxHeight;
  element.style.overflow = originalOverflow;
  element.style.padding = originalPadding;
  element.style.margin = originalMargin;
  element.style.borderRadius = originalBorderRadius;

  // Remove 'exporting' class
  element.classList.remove("exporting");

  // Load the chart image
  const chartImg = await loadImage(chartDataUrl);

  // Create canvas with X dimensions
  const canvas = document.createElement("canvas");
  canvas.width = X_IMAGE_WIDTH;
  canvas.height = X_IMAGE_HEIGHT;
  const ctx = canvas.getContext("2d")!;

  // Fill background
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, X_IMAGE_WIDTH, X_IMAGE_HEIGHT);

  // Stretch to fill the entire canvas - content is designed for this format
  ctx.drawImage(chartImg, 0, 0, X_IMAGE_WIDTH, X_IMAGE_HEIGHT);

  // Convert canvas to blob and download
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `${filename}.png`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

/**
 * Load an image from a data URL
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Generate a filename for chart exports
 */
export function getChartFilename(chartName: string, timeRange?: number): string {
  const timestamp = Date.now();
  const range = timeRange ? `-${timeRange}d` : "";
  return `gvc-${chartName}${range}-${timestamp}`;
}
