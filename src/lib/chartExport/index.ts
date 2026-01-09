import {
  ChartExportConfig,
  EXPORT_WIDTH,
  EXPORT_HEIGHT,
  CHART_TOP,
  CHART_MARGIN,
  HEADER_HEIGHT,
} from "./types";
import { drawBackground, drawHeader, drawLegendBar, downloadCanvas, ensureFontsLoaded } from "./canvas";
import { extractChartSVG, svgToImage } from "./svg";

export type { ChartExportConfig, LegendItem } from "./types";

// Render at 2x for crisp output
const SCALE = 2;

/**
 * Generate chart canvas without downloading
 */
async function generateChartCanvas(
  chartContainer: HTMLElement,
  config: ChartExportConfig
): Promise<HTMLCanvasElement> {
  // Ensure custom fonts are loaded before drawing
  await ensureFontsLoaded();

  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_WIDTH * SCALE;
  canvas.height = EXPORT_HEIGHT * SCALE;
  const ctx = canvas.getContext("2d")!;

  // Scale context for 2x rendering
  ctx.scale(SCALE, SCALE);

  // 1. Fill background
  drawBackground(ctx);

  // 2. Draw header (brand name, title, subtitle)
  drawHeader(ctx, config.title, config.subtitle);

  // 3. Draw legend bar
  drawLegendBar(ctx, config.legend, HEADER_HEIGHT);

  // 4. Extract and draw chart SVG
  const svg = extractChartSVG(chartContainer);
  if (svg) {
    const chartWidth = EXPORT_WIDTH - CHART_MARGIN * 2;
    const chartHeight = EXPORT_HEIGHT - CHART_TOP - CHART_MARGIN;

    try {
      // Render SVG at 2x resolution for crispness
      const chartImg = await svgToImage(svg, chartWidth * SCALE, chartHeight * SCALE);
      ctx.drawImage(chartImg, CHART_MARGIN, CHART_TOP, chartWidth, chartHeight);
    } catch (error) {
      console.error("Failed to render chart SVG:", error);
    }
  }

  return canvas;
}

/**
 * Export a chart to PNG using canvas-based rendering.
 * Renders at 2x resolution for crisp text and graphics.
 */
export async function exportChartToCanvas(
  chartContainer: HTMLElement,
  config: ChartExportConfig
): Promise<void> {
  const canvas = await generateChartCanvas(chartContainer, config);
  downloadCanvas(canvas, config.filename);
}

/**
 * Share chart to X/Twitter using Web Share API or clipboard fallback
 */
export async function shareChartToX(
  chartContainer: HTMLElement,
  config: ChartExportConfig
): Promise<void> {
  const canvas = await generateChartCanvas(chartContainer, config);

  // Convert canvas to blob
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), "image/png");
  });

  const shareText = `${config.title} - Good Vibes Club Analytics\n\n#GoodVibesClub #NFT`;
  const shareUrl = "https://goodvibesclub.io";

  // Try Web Share API first (works on mobile and some desktop browsers)
  if (navigator.share && navigator.canShare) {
    const file = new File([blob], `${config.filename}.png`, { type: "image/png" });
    const shareData = {
      text: shareText,
      url: shareUrl,
      files: [file],
    };

    if (navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // User cancelled or share failed, fall through to fallback
        if ((err as Error).name === "AbortError") return;
      }
    }
  }

  // Fallback: Copy image to clipboard and open X intent
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob }),
    ]);

    // Open X/Twitter with pre-filled text
    const tweetText = encodeURIComponent(`${shareText}\n\n${shareUrl}`);
    window.open(`https://twitter.com/intent/tweet?text=${tweetText}`, "_blank");

    // Alert user that image is copied
    alert("Image copied to clipboard! Paste it into your tweet.");
  } catch (err) {
    // If clipboard fails, just open X intent
    const tweetText = encodeURIComponent(`${shareText}\n\n${shareUrl}`);
    window.open(`https://twitter.com/intent/tweet?text=${tweetText}`, "_blank");
  }
}

/**
 * Generate a filename for chart exports
 */
export function getChartFilename(chartName: string, timeRange?: number): string {
  const timestamp = Date.now();
  const range = timeRange ? `-${timeRange}d` : "";
  return `gvc-${chartName}${range}-${timestamp}`;
}
