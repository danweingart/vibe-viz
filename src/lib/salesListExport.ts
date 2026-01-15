"use client";

import type { SaleRecord } from "@/types/api";

// Canvas dimensions for social media (4:5 portrait like chart exports)
const EXPORT_WIDTH = 1080;
const EXPORT_HEIGHT = 1350;
const SCALE = 2; // Render at 2x for crispness

// Layout constants
const PADDING = 40;
const HEADER_HEIGHT = 120;
const ROW_HEIGHT = 120;
const IMAGE_SIZE = 80;
const RANK_WIDTH = 50;

// Colors
const COLORS = {
  background: "#0a0a0a",
  cardBackground: "#141414",
  brand: "#ffe048",
  foreground: "#fafafa",
  foregroundMuted: "#a1a1aa",
  weth: "#fbbf24", // Yellow-400 for WETH
  border: "#27272a",
} as const;

/**
 * Get the computed font-family from a CSS variable
 */
function getFontFamily(cssVar: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.body).getPropertyValue(cssVar).trim();
  return value || fallback;
}

/**
 * Ensure fonts are loaded before drawing
 */
async function ensureFontsLoaded(): Promise<void> {
  if (typeof document === "undefined") return;
  await document.fonts.ready;
}

/**
 * Convert SeaDN CDN URL to full resolution raw URL
 */
function getFullResolutionUrl(url: string): string {
  if (!url) return url;
  return url.replace(/^https:\/\/[^.]+\.seadn\.io/, "https://raw2.seadn.io");
}

/**
 * Load an image from URL with CORS support
 */
async function loadImage(url: string): Promise<HTMLImageElement | null> {
  const fullResUrl = getFullResolutionUrl(url);

  const img = await tryLoadImage(fullResUrl);
  if (img) return img;

  // Fall back to original URL
  if (fullResUrl !== url) {
    return tryLoadImage(url);
  }

  return null;
}

function tryLoadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Format time ago for display
 */
function formatTimeAgo(timestamp: Date): string {
  const now = Date.now();
  const then = timestamp.getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

/**
 * Format date for display
 */
function formatDate(timestamp: Date): string {
  return timestamp.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Draw rounded rectangle helper
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

/**
 * Draw text with custom letter spacing
 * Canvas doesn't support letter-spacing CSS, so we draw character-by-character
 */
function fillTextWithSpacing(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number
): void {
  const chars = text.split('');
  let currentX = x;

  // Calculate total width for proper alignment
  const totalWidth = chars.reduce((sum, char, i) => {
    const charWidth = ctx.measureText(char).width;
    return sum + charWidth + (i < chars.length - 1 ? spacing : 0);
  }, 0);

  // Adjust start position based on text alignment
  if (ctx.textAlign === 'center') {
    currentX = x - totalWidth / 2;
  } else if (ctx.textAlign === 'right') {
    currentX = x - totalWidth;
  }

  // Save original textAlign and set to left for character drawing
  const originalAlign = ctx.textAlign;
  ctx.textAlign = 'left';

  // Draw each character
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], currentX, y);
    currentX += ctx.measureText(chars[i]).width + spacing;
  }

  // Restore original textAlign
  ctx.textAlign = originalAlign;
}

export type SalesListType = "recent" | "top";

export interface SalesListExportConfig {
  type: SalesListType;
  timeRange?: number; // For top sales
}

/**
 * Export a list of sales to a social sharing card PNG
 */
export async function exportSalesListToCanvas(
  sales: SaleRecord[],
  config: SalesListExportConfig
): Promise<void> {
  await ensureFontsLoaded();

  // Load all images in parallel
  const imagePromises = sales.slice(0, 8).map((sale) => loadImage(sale.imageUrl));
  const images = await Promise.all(imagePromises);

  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_WIDTH * SCALE;
  canvas.height = EXPORT_HEIGHT * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.scale(SCALE, SCALE);

  const brice = getFontFamily("--font-brice", "system-ui, sans-serif");
  const mundial = getFontFamily("--font-mundial", "system-ui, sans-serif");

  // 1. Draw background
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);

  // 2. Draw header
  const centerX = EXPORT_WIDTH / 2;

  // Brand name
  ctx.fillStyle = COLORS.brand;
  ctx.font = `bold 42px ${brice}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Good Vibes Club", centerX, 45);

  // Title
  const title = config.type === "recent"
    ? "Recent Sales"
    : `Top Sales${config.timeRange ? ` (${config.timeRange}D)` : ""}`;
  ctx.fillStyle = COLORS.foreground;
  ctx.font = `bold 32px ${brice}`;
  ctx.fillText(title, centerX, 90);

  // 3. Draw sales list
  const listStartY = HEADER_HEIGHT + 20;
  const salesToDraw = sales.slice(0, 8);

  for (let i = 0; i < salesToDraw.length; i++) {
    const sale = salesToDraw[i];
    const img = images[i];
    const rowY = listStartY + i * (ROW_HEIGHT + 12);

    // Row background
    ctx.fillStyle = COLORS.cardBackground;
    drawRoundedRect(ctx, PADDING, rowY, EXPORT_WIDTH - PADDING * 2, ROW_HEIGHT, 12);
    ctx.fill();

    // Rank number (for top sales) or index
    const rankX = PADDING + 25;
    const rankY = rowY + ROW_HEIGHT / 2;

    if (config.type === "top") {
      // Draw rank circle
      ctx.fillStyle = "rgba(255, 224, 72, 0.2)";
      ctx.beginPath();
      ctx.arc(rankX, rankY, 20, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = COLORS.brand;
      ctx.font = `bold 18px ${brice}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${i + 1}`, rankX, rankY);
    }

    // NFT image
    const imageX = config.type === "top" ? PADDING + RANK_WIDTH + 15 : PADDING + 20;
    const imageY = rowY + (ROW_HEIGHT - IMAGE_SIZE) / 2;

    if (img) {
      ctx.save();
      drawRoundedRect(ctx, imageX, imageY, IMAGE_SIZE, IMAGE_SIZE, 8);
      ctx.clip();
      ctx.drawImage(img, imageX, imageY, IMAGE_SIZE, IMAGE_SIZE);
      ctx.restore();
    } else {
      ctx.fillStyle = COLORS.border;
      drawRoundedRect(ctx, imageX, imageY, IMAGE_SIZE, IMAGE_SIZE, 8);
      ctx.fill();

      ctx.fillStyle = COLORS.foregroundMuted;
      ctx.font = `bold 14px ${brice}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`#${sale.tokenId}`, imageX + IMAGE_SIZE / 2, imageY + IMAGE_SIZE / 2);
    }

    // Token info
    const infoX = imageX + IMAGE_SIZE + 20;
    const infoY = rowY + ROW_HEIGHT / 2;

    // Token name
    ctx.fillStyle = COLORS.foreground;
    ctx.font = `600 20px ${mundial}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(sale.tokenName, infoX, infoY - 15);

    // Time info
    ctx.fillStyle = COLORS.foregroundMuted;
    ctx.font = `400 16px ${mundial}`;
    const timeText = config.type === "recent"
      ? formatTimeAgo(sale.timestamp)
      : formatDate(sale.timestamp);
    ctx.fillText(timeText, infoX, infoY + 15);

    // Price (right aligned)
    const priceX = EXPORT_WIDTH - PADDING - 30;

    // ETH price
    const priceColor = sale.paymentToken === "WETH" ? COLORS.weth : COLORS.foreground;
    ctx.fillStyle = priceColor;
    ctx.font = `bold 22px ${brice}`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const tokenSymbol = sale.paymentToken === "OTHER" ? sale.paymentSymbol : sale.paymentToken;
    ctx.fillText(`${sale.priceEth.toFixed(2)} ${tokenSymbol}`, priceX, infoY - 15);

    // USD price - with letter spacing for clarity (always shows 2 decimal places)
    ctx.fillStyle = COLORS.foregroundMuted;
    ctx.font = `400 16px ${mundial}`;
    const usdText = `$${sale.priceUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    fillTextWithSpacing(ctx, usdText, priceX, infoY + 15, 0.3);
  }

  // 4. Draw footer watermark
  ctx.fillStyle = COLORS.foregroundMuted;
  ctx.font = `400 14px ${mundial}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("goodvibesclub.io", centerX, EXPORT_HEIGHT - 30);

  // 5. Trigger download
  const timestamp = Date.now();
  const filename = config.type === "recent"
    ? `gvc-recent-sales-${timestamp}`
    : `gvc-top-sales-${config.timeRange || 30}d-${timestamp}`;

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
 * Share sales list to X/Twitter
 */
export async function shareSalesListToX(
  sales: SaleRecord[],
  config: SalesListExportConfig
): Promise<void> {
  await ensureFontsLoaded();

  // Load all images in parallel
  const imagePromises = sales.slice(0, 8).map((sale) => loadImage(sale.imageUrl));
  const images = await Promise.all(imagePromises);

  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_WIDTH * SCALE;
  canvas.height = EXPORT_HEIGHT * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.scale(SCALE, SCALE);

  const brice = getFontFamily("--font-brice", "system-ui, sans-serif");
  const mundial = getFontFamily("--font-mundial", "system-ui, sans-serif");

  // Same drawing logic as exportSalesListToCanvas
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);

  const centerX = EXPORT_WIDTH / 2;

  ctx.fillStyle = COLORS.brand;
  ctx.font = `bold 42px ${brice}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Good Vibes Club", centerX, 45);

  const title = config.type === "recent"
    ? "Recent Sales"
    : `Top Sales${config.timeRange ? ` (${config.timeRange}D)` : ""}`;
  ctx.fillStyle = COLORS.foreground;
  ctx.font = `bold 32px ${brice}`;
  ctx.fillText(title, centerX, 90);

  const listStartY = HEADER_HEIGHT + 20;
  const salesToDraw = sales.slice(0, 8);

  for (let i = 0; i < salesToDraw.length; i++) {
    const sale = salesToDraw[i];
    const img = images[i];
    const rowY = listStartY + i * (ROW_HEIGHT + 12);

    ctx.fillStyle = COLORS.cardBackground;
    drawRoundedRect(ctx, PADDING, rowY, EXPORT_WIDTH - PADDING * 2, ROW_HEIGHT, 12);
    ctx.fill();

    const rankX = PADDING + 25;
    const rankY = rowY + ROW_HEIGHT / 2;

    if (config.type === "top") {
      ctx.fillStyle = "rgba(255, 224, 72, 0.2)";
      ctx.beginPath();
      ctx.arc(rankX, rankY, 20, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = COLORS.brand;
      ctx.font = `bold 18px ${brice}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${i + 1}`, rankX, rankY);
    }

    const imageX = config.type === "top" ? PADDING + RANK_WIDTH + 15 : PADDING + 20;
    const imageY = rowY + (ROW_HEIGHT - IMAGE_SIZE) / 2;

    if (img) {
      ctx.save();
      drawRoundedRect(ctx, imageX, imageY, IMAGE_SIZE, IMAGE_SIZE, 8);
      ctx.clip();
      ctx.drawImage(img, imageX, imageY, IMAGE_SIZE, IMAGE_SIZE);
      ctx.restore();
    } else {
      ctx.fillStyle = COLORS.border;
      drawRoundedRect(ctx, imageX, imageY, IMAGE_SIZE, IMAGE_SIZE, 8);
      ctx.fill();

      ctx.fillStyle = COLORS.foregroundMuted;
      ctx.font = `bold 14px ${brice}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`#${sale.tokenId}`, imageX + IMAGE_SIZE / 2, imageY + IMAGE_SIZE / 2);
    }

    const infoX = imageX + IMAGE_SIZE + 20;
    const infoY = rowY + ROW_HEIGHT / 2;

    ctx.fillStyle = COLORS.foreground;
    ctx.font = `600 20px ${mundial}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(sale.tokenName, infoX, infoY - 15);

    ctx.fillStyle = COLORS.foregroundMuted;
    ctx.font = `400 16px ${mundial}`;
    const timeText = config.type === "recent"
      ? formatTimeAgo(sale.timestamp)
      : formatDate(sale.timestamp);
    ctx.fillText(timeText, infoX, infoY + 15);

    const priceX = EXPORT_WIDTH - PADDING - 30;
    const priceColor = sale.paymentToken === "WETH" ? COLORS.weth : COLORS.foreground;
    ctx.fillStyle = priceColor;
    ctx.font = `bold 22px ${brice}`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const tokenSymbol = sale.paymentToken === "OTHER" ? sale.paymentSymbol : sale.paymentToken;
    ctx.fillText(`${sale.priceEth.toFixed(2)} ${tokenSymbol}`, priceX, infoY - 15);

    // USD price - with letter spacing for clarity (always shows 2 decimal places)
    ctx.fillStyle = COLORS.foregroundMuted;
    ctx.font = `400 16px ${mundial}`;
    const usdText = `$${sale.priceUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    fillTextWithSpacing(ctx, usdText, priceX, infoY + 15, 0.3);
  }

  ctx.fillStyle = COLORS.foregroundMuted;
  ctx.font = `400 14px ${mundial}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("goodvibesclub.io", centerX, EXPORT_HEIGHT - 30);

  // Convert to blob for sharing
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), "image/png");
  });

  const shareText = `${title} - Good Vibes Club Analytics\n\n#GoodVibesClub #NFT`;
  const shareUrl = "https://goodvibesclub.io";

  // Try Web Share API first
  if (navigator.share && navigator.canShare) {
    const timestamp = Date.now();
    const filename = config.type === "recent"
      ? `gvc-recent-sales-${timestamp}`
      : `gvc-top-sales-${config.timeRange || 30}d-${timestamp}`;
    const file = new File([blob], `${filename}.png`, { type: "image/png" });
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
        if ((err as Error).name === "AbortError") return;
      }
    }
  }

  // Fallback: Copy image to clipboard and open X intent
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob }),
    ]);

    const tweetText = encodeURIComponent(`${shareText}\n\n${shareUrl}`);
    window.open(`https://twitter.com/intent/tweet?text=${tweetText}`, "_blank");
    alert("Image copied to clipboard! Paste it into your tweet.");
  } catch {
    const tweetText = encodeURIComponent(`${shareText}\n\n${shareUrl}`);
    window.open(`https://twitter.com/intent/tweet?text=${tweetText}`, "_blank");
  }
}
