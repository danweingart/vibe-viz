import {
  LegendItem,
  StatCardData,
  EXPORT_WIDTH,
  EXPORT_HEIGHT,
  HEADER_HEIGHT,
  LEGEND_HEIGHT,
  COLORS,
} from "./types";
import { EXPORT_BRANDING } from "@/lib/chartConfig";

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
 * Draw header with brand name (centered), title, and subtitle
 * Uses Brice Bold for brand/title, Mundial for subtitle
 */
export function drawHeader(
  ctx: CanvasRenderingContext2D,
  title: string,
  subtitle: string
): void {
  const centerX = EXPORT_WIDTH / 2;
  const { brandFontSize, titleFontSize, subtitleFontSize } =
    EXPORT_BRANDING.header;

  // Get font families from CSS variables
  const brice = getFontFamily("--font-brice", "system-ui, sans-serif");
  const mundial = getFontFamily("--font-mundial", "system-ui, sans-serif");

  // Vertical positions - tighter spacing for more chart room
  const brandY = 40;
  const titleY = 82;
  const subtitleY = 112;

  // Draw brand name - "Good Vibes Club" in yellow (Brice Bold, centered)
  ctx.fillStyle = COLORS.brand;
  ctx.font = `bold ${brandFontSize}px ${brice}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(EXPORT_BRANDING.header.brandText, centerX, brandY);

  // Title in white (Brice Bold)
  ctx.fillStyle = COLORS.foreground;
  ctx.font = `bold ${titleFontSize}px ${brice}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(title, centerX, titleY);

  // Subtitle in muted gray (Mundial Regular)
  ctx.fillStyle = COLORS.foregroundMuted;
  ctx.font = `400 ${subtitleFontSize}px ${mundial}`;
  ctx.fillText(subtitle, centerX, subtitleY);
}

/**
 * Draw legend bar with pill-shaped buttons (matches front-end style)
 * Each legend item is a rounded pill with colored dot + label : value
 */
export function drawLegendBar(
  ctx: CanvasRenderingContext2D,
  items: LegendItem[],
  y: number
): void {
  const mundial = getFontFamily("--font-mundial", "system-ui, sans-serif");
  const { itemFontSize, valueFontSize, dotSize, gap, pillPadding, pillRadius, pillGap } =
    EXPORT_BRANDING.legendBar;

  // Calculate pill dimensions for each item
  const pillHeights: number[] = [];
  const pillWidths: number[] = [];

  items.forEach((item) => {
    ctx.font = `500 ${itemFontSize}px ${mundial}`;
    const labelWidth = ctx.measureText(item.label).width;
    ctx.font = `600 ${valueFontSize}px ${mundial}`;
    const valueWidth = ctx.measureText(item.value).width;

    // Pill width: dot + gap + label + ":" + value + padding
    const contentWidth = dotSize + gap + labelWidth + 8 + valueWidth;
    pillWidths.push(contentWidth + pillPadding.h * 2);
    pillHeights.push(28); // Fixed height for pills
  });

  // Calculate total width and starting X for centering
  const totalWidth = pillWidths.reduce((sum, w) => sum + w, 0) + pillGap * (items.length - 1);
  let currentX = (EXPORT_WIDTH - totalWidth) / 2;
  const pillY = y + (LEGEND_HEIGHT - 28) / 2;

  items.forEach((item, index) => {
    const pillWidth = pillWidths[index];
    const pillHeight = pillHeights[index];

    // Draw pill background
    ctx.fillStyle = COLORS.pillBackground;
    roundRect(ctx, currentX, pillY, pillWidth, pillHeight, pillRadius);
    ctx.fill();

    // Draw pill border
    ctx.strokeStyle = COLORS.pillBorder;
    ctx.lineWidth = 1;
    roundRect(ctx, currentX, pillY, pillWidth, pillHeight, pillRadius);
    ctx.stroke();

    // Content positioning inside pill
    const contentY = pillY + pillHeight / 2;
    let contentX = currentX + pillPadding.h;

    // Draw colored dot
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(contentX + dotSize / 2, contentY, dotSize / 2, 0, Math.PI * 2);
    ctx.fill();
    contentX += dotSize + gap;

    // Draw label
    ctx.fillStyle = COLORS.foregroundMuted;
    ctx.font = `500 ${itemFontSize}px ${mundial}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(item.label, contentX, contentY);
    contentX += ctx.measureText(item.label).width;

    // Draw colon separator
    ctx.fillStyle = COLORS.foregroundMuted;
    ctx.fillText(":", contentX + 2, contentY);
    contentX += 8;

    // Draw value (colored, semi-bold)
    ctx.fillStyle = item.color;
    ctx.font = `600 ${valueFontSize}px ${mundial}`;
    ctx.fillText(item.value, contentX, contentY);

    // Move to next pill position
    currentX += pillWidth + pillGap;
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

/**
 * Helper function to draw a rounded rectangle path
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Draw stat cards at the bottom of the export (matches front-end bordered cards)
 */
export function drawStatCards(
  ctx: CanvasRenderingContext2D,
  statCards: StatCardData[],
  y: number
): void {
  if (!statCards || statCards.length === 0) return;

  const mundial = getFontFamily("--font-mundial", "system-ui, sans-serif");
  const { padding, cardHeight, labelFontSize, valueFontSize, subValueFontSize, gap, borderRadius } =
    EXPORT_BRANDING.statCards;

  const availableWidth = EXPORT_WIDTH - padding * 2;
  const cardWidth = (availableWidth - gap * (statCards.length - 1)) / statCards.length;

  statCards.forEach((card, index) => {
    const cardX = padding + index * (cardWidth + gap);
    const cardY = y + 10; // Small top margin

    // Draw card background
    ctx.fillStyle = COLORS.cardBackground;
    roundRect(ctx, cardX, cardY, cardWidth, cardHeight, borderRadius);
    ctx.fill();

    // Draw card border
    ctx.strokeStyle = COLORS.cardBorder;
    ctx.lineWidth = 1;
    roundRect(ctx, cardX, cardY, cardWidth, cardHeight, borderRadius);
    ctx.stroke();

    // Calculate vertical positioning
    const hasSubValue = card.subValue || card.change !== undefined;
    const labelY = cardY + 16;
    const valueY = hasSubValue ? cardY + cardHeight / 2 : cardY + cardHeight / 2 + 6;
    const subValueY = cardY + cardHeight - 14;

    // Draw label at top (muted, smaller)
    ctx.fillStyle = COLORS.foregroundMuted;
    ctx.font = `500 ${labelFontSize}px ${mundial}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(card.label, cardX + cardWidth / 2, labelY);

    // Draw value (large, bold, white)
    ctx.fillStyle = COLORS.foreground;
    ctx.font = `700 ${valueFontSize}px ${mundial}`;
    ctx.textBaseline = "middle";
    ctx.fillText(card.value, cardX + cardWidth / 2, valueY);

    // Draw sub-value or change indicator at bottom if present
    if (hasSubValue) {
      ctx.font = `500 ${subValueFontSize}px ${mundial}`;
      ctx.textBaseline = "bottom";

      if (card.change !== undefined) {
        ctx.fillStyle = card.change >= 0 ? COLORS.success : COLORS.danger;
        const arrow = card.change >= 0 ? "↑" : "↓";
        ctx.fillText(`${arrow} ${Math.abs(card.change).toFixed(1)}%`, cardX + cardWidth / 2, subValueY);
      } else if (card.subValue) {
        ctx.fillStyle = COLORS.foregroundMuted;
        ctx.fillText(card.subValue, cardX + cardWidth / 2, subValueY);
      }
    }
  });
}
