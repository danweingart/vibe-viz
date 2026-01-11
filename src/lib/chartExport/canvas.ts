import {
  LegendItem,
  EXPORT_WIDTH,
  EXPORT_HEIGHT,
  HEADER_HEIGHT,
  LEGEND_HEIGHT,
  COLORS,
} from "./types";
import { EXPORT_BRANDING } from "@/lib/chartConfig";

// Cache the loaded logo image
let logoImageCache: HTMLImageElement | null = null;

/**
 * Get the computed font-family from a CSS variable
 * next/font sets variables on body via class, so we read from body
 */
function getFontFamily(cssVar: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  // next/font sets CSS variables on body, not :root
  const value = getComputedStyle(document.body).getPropertyValue(cssVar).trim();
  return value || fallback;
}

/**
 * Load and cache the logo image
 */
export async function loadLogoImage(): Promise<HTMLImageElement | null> {
  if (logoImageCache) return logoImageCache;
  if (typeof document === "undefined") return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      logoImageCache = img;
      resolve(img);
    };
    img.onerror = () => {
      console.warn("Failed to load logo image for export");
      resolve(null);
    };
    img.src = EXPORT_BRANDING.header.logoPath;
  });
}

/**
 * Ensure fonts are loaded before drawing
 */
export async function ensureFontsLoaded(): Promise<void> {
  if (typeof document === "undefined") return;
  await document.fonts.ready;
}

/**
 * Fill canvas with background color
 */
export function drawBackground(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
}

/**
 * Draw header with logo (left side) + brand name, title, and subtitle (centered)
 * Uses Brice Bold for brand/title, Mundial for subtitle
 */
export function drawHeader(
  ctx: CanvasRenderingContext2D,
  title: string,
  subtitle: string,
  logoImg?: HTMLImageElement | null
): void {
  const centerX = EXPORT_WIDTH / 2;
  const { logoSize, brandFontSize, titleFontSize, subtitleFontSize, padding, gap } =
    EXPORT_BRANDING.header;

  // Get font families from CSS variables
  const brice = getFontFamily("--font-brice", "system-ui, sans-serif");
  const mundial = getFontFamily("--font-mundial", "system-ui, sans-serif");

  // Calculate vertical center for logo + brand text row
  const logoRowY = 32;

  if (logoImg) {
    // Layout: logo + gap + "Good Vibes Club" centered together
    ctx.font = `bold ${brandFontSize}px ${brice}`;
    const brandTextWidth = ctx.measureText(EXPORT_BRANDING.header.brandText).width;
    const totalWidth = logoSize + gap + brandTextWidth;
    const startX = centerX - totalWidth / 2;

    // Draw logo
    ctx.drawImage(logoImg, startX, logoRowY - logoSize / 2, logoSize, logoSize);

    // Draw brand name - "Good Vibes Club" in yellow (Brice Bold)
    ctx.fillStyle = COLORS.brand;
    ctx.font = `bold ${brandFontSize}px ${brice}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(EXPORT_BRANDING.header.brandText, startX + logoSize + gap, logoRowY);
  } else {
    // No logo - just center the brand text
    ctx.fillStyle = COLORS.brand;
    ctx.font = `bold ${brandFontSize}px ${brice}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(EXPORT_BRANDING.header.brandText, centerX, logoRowY);
  }

  // Title in white (Brice Bold)
  ctx.fillStyle = COLORS.foreground;
  ctx.font = `bold ${titleFontSize}px ${brice}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(title, centerX, 68);

  // Subtitle in muted gray (Mundial Regular)
  ctx.fillStyle = COLORS.foregroundMuted;
  ctx.font = `400 ${subtitleFontSize}px ${mundial}`;
  ctx.fillText(subtitle, centerX, 92);
}

/**
 * Draw legend bar with equal-width columns and dividers
 * Stacked layout: dot + label on top, value below (both centered)
 */
export function drawLegendBar(
  ctx: CanvasRenderingContext2D,
  items: LegendItem[],
  y: number
): void {
  // Get Mundial font family
  const mundial = getFontFamily("--font-mundial", "system-ui, sans-serif");

  // Draw legend bar background
  ctx.fillStyle = COLORS.legendBar;
  ctx.fillRect(0, y, EXPORT_WIDTH, LEGEND_HEIGHT);

  const columnWidth = EXPORT_WIDTH / items.length;
  const topLineY = y + 18;
  const bottomLineY = y + 40;

  items.forEach((item, index) => {
    const columnCenterX = columnWidth * index + columnWidth / 2;

    // Top line: dot + label (centered together)
    const labelText = item.label;
    ctx.font = `400 14px ${mundial}`;
    const labelWidth = ctx.measureText(labelText).width;
    const dotRadius = 5;
    const gap = 8;
    const totalWidth = dotRadius * 2 + gap + labelWidth;
    const startX = columnCenterX - totalWidth / 2;

    // Draw colored dot
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(startX + dotRadius, topLineY, dotRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw label (Mundial Regular)
    ctx.fillStyle = COLORS.foregroundMuted;
    ctx.font = `400 14px ${mundial}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(labelText, startX + dotRadius * 2 + gap, topLineY);

    // Bottom line: value (centered, bold, colored)
    ctx.fillStyle = item.color;
    ctx.font = `700 16px ${mundial}`;
    ctx.textAlign = "center";
    ctx.fillText(item.value, columnCenterX, bottomLineY);

    // Draw vertical divider (except after last item)
    if (index < items.length - 1) {
      ctx.strokeStyle = COLORS.divider;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(columnWidth * (index + 1), y + 8);
      ctx.lineTo(columnWidth * (index + 1), y + LEGEND_HEIGHT - 8);
      ctx.stroke();
    }
  });
}

/**
 * Download canvas as PNG file
 */
export function downloadCanvas(
  canvas: HTMLCanvasElement,
  filename: string
): void {
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
