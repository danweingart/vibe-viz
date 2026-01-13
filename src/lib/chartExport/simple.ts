import { toPng } from "html-to-image";

/**
 * Generate PNG data URL from DOM element
 * Used to pre-generate the image for preview before sharing
 */
export async function generatePngDataUrl(element: HTMLElement): Promise<string> {
  // Wait for any pending renders (Recharts needs extra time for SVG)
  await new Promise((resolve) => requestAnimationFrame(resolve));
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Capture the element as PNG
  const dataUrl = await toPng(element, {
    pixelRatio: 2, // 2x for crisp output
    backgroundColor: "#0a0a0a",
  });

  return dataUrl;
}

/**
 * Simple PNG export using html-to-image
 *
 * Captures a DOM element exactly as rendered, including all CSS styling.
 * Much simpler than the canvas-based approach.
 */
export async function exportToPng(
  element: HTMLElement,
  filename: string
): Promise<void> {
  try {
    const dataUrl = await generatePngDataUrl(element);
    downloadFromDataUrl(dataUrl, filename);
  } catch (error) {
    console.error("Failed to export PNG:", error);
    throw error;
  }
}

/**
 * Download PNG from data URL
 */
export function downloadFromDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.download = `${filename}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Copy image to clipboard from data URL
 * Returns true if successful, false if clipboard API not supported or failed
 */
export async function copyImageToClipboard(dataUrl: string): Promise<boolean> {
  try {
    // Check if clipboard API is available
    if (!navigator.clipboard || !navigator.clipboard.write) {
      return false;
    }

    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob }),
    ]);

    return true;
  } catch (error) {
    console.error("Failed to copy image to clipboard:", error);
    return false;
  }
}

/**
 * Generate a timestamped filename
 */
export function getExportFilename(chartName: string, timeRange?: number): string {
  const timestamp = Date.now();
  const range = timeRange ? `-${timeRange}d` : "";
  return `gvc-${chartName}${range}-${timestamp}`;
}
