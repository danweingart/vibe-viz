import {
  ChartExportConfig,
  EXPORT_WIDTH,
  EXPORT_HEIGHT,
  CHART_TOP,
  CHART_MARGIN,
  HEADER_HEIGHT,
  STAT_CARDS_HEIGHT,
} from "./types";
import { drawBackground, drawHeader, drawLegendBar, drawStatCards, downloadCanvas, ensureFontsLoaded } from "./canvas";
import { extractChartSVG, svgToImage } from "./svg";

export type { ChartExportConfig, LegendItem, StatCardData } from "./types";

// Render at 2x for crisp output
const SCALE = 2;

export interface ExportOptions {
  /** If true, the container SVG is already at export dimensions (from off-screen render) */
  useExportDimensions?: boolean;
}

/**
 * Generate chart canvas without downloading
 */
async function generateChartCanvas(
  chartContainer: HTMLElement,
  config: ChartExportConfig,
  options?: ExportOptions
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

  // Calculate chart area considering stat cards
  const hasStatCards = config.statCards && config.statCards.length > 0;
  const statCardsY = EXPORT_HEIGHT - STAT_CARDS_HEIGHT;
  const chartBottom = hasStatCards ? statCardsY - CHART_MARGIN : EXPORT_HEIGHT - CHART_MARGIN;

  // 4. Extract and draw chart SVG
  const svg = extractChartSVG(chartContainer);
  if (svg) {
    const chartWidth = EXPORT_WIDTH - CHART_MARGIN * 2;
    const chartHeight = chartBottom - CHART_TOP;

    try {
      // Render SVG at 2x resolution for crispness
      // If useExportDimensions is true, the SVG is already at correct dimensions
      const chartImg = await svgToImage(svg, chartWidth * SCALE, chartHeight * SCALE, {
        alreadyAtTargetDimensions: options?.useExportDimensions,
      });
      ctx.drawImage(chartImg, CHART_MARGIN, CHART_TOP, chartWidth, chartHeight);
    } catch (error) {
      console.error("Failed to render chart SVG:", error);
    }
  }

  // 5. Draw stat cards at bottom (if present)
  if (hasStatCards) {
    drawStatCards(ctx, config.statCards!, statCardsY);
  }

  return canvas;
}

/**
 * Export a chart to PNG using canvas-based rendering.
 * Renders at 2x resolution for crisp text and graphics.
 */
export async function exportChartToCanvas(
  chartContainer: HTMLElement,
  config: ChartExportConfig,
  options?: ExportOptions
): Promise<void> {
  const canvas = await generateChartCanvas(chartContainer, config, options);
  downloadCanvas(canvas, config.filename);
}

/**
 * Share chart to X/Twitter using Web Share API or clipboard fallback
 */
export async function shareChartToX(
  chartContainer: HTMLElement,
  config: ChartExportConfig,
  options?: ExportOptions
): Promise<void> {
  const canvas = await generateChartCanvas(chartContainer, config, options);

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
