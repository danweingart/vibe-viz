"use client";

import type { NFTHistory } from "@/types/blockchain";

// Canvas dimensions for X/Twitter optimal image (16:9)
const EXPORT_WIDTH = 1200;
const EXPORT_HEIGHT = 675;

// Layout constants - side-by-side layout
const PADDING = 24;
const IMAGE_SIZE = EXPORT_HEIGHT - (PADDING * 2); // 627px - maximizes image
const IMAGE_X = PADDING;
const IMAGE_Y = PADDING;
const INFO_X = IMAGE_X + IMAGE_SIZE + 24; // Start of right panel (reduced from 40px for better centering)
const INFO_WIDTH = EXPORT_WIDTH - INFO_X - PADDING;
const INFO_CENTER_X = INFO_X + INFO_WIDTH / 2;

// Colors
const COLORS = {
  background: "#0a0a0a",
  brand: "#ffe048",
  foreground: "#fafafa",
  foregroundMuted: "#a1a1aa",
  success: "#22c55e",
  danger: "#ef4444",
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
 * i.seadn.io, i2c.seadn.io, etc. → raw2.seadn.io
 */
function getFullResolutionUrl(url: string): string {
  if (!url) return url;
  // Match any seadn.io subdomain and replace with raw2
  return url.replace(/^https:\/\/[^.]+\.seadn\.io/, "https://raw2.seadn.io");
}

/**
 * Load an image from URL with CORS support
 * Tries full resolution first, falls back to original URL
 */
async function loadImage(url: string): Promise<HTMLImageElement | null> {
  const fullResUrl = getFullResolutionUrl(url);

  // Try full resolution first
  const fullResImg = await tryLoadImage(fullResUrl);
  if (fullResImg) return fullResImg;

  // Fall back to original URL if full res fails
  if (fullResUrl !== url) {
    return tryLoadImage(url);
  }

  return null;
}

/**
 * Attempt to load a single image URL
 */
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
 * Format ETH price with proper formatting
 */
function formatEthPrice(eth: number): string {
  if (eth >= 1) {
    return `${eth.toFixed(2)} ETH`;
  }
  return `${eth.toFixed(3)} ETH`;
}

/**
 * Format profit/loss with sign
 */
function formatProfitLoss(eth: number): string {
  const sign = eth >= 0 ? "+" : "";
  return `${sign}${eth.toFixed(3)} ETH`;
}

/**
 * Format percentage with sign
 */
function formatPercent(percent: number): string {
  const sign = percent >= 0 ? "+" : "";
  return `${sign}${percent.toFixed(1)}%`;
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

  // Calculate total width to center properly
  const totalWidth = chars.reduce((sum, char, i) => {
    const charWidth = ctx.measureText(char).width;
    return sum + charWidth + (i < chars.length - 1 ? spacing : 0);
  }, 0);

  // Start position for centered text
  if (ctx.textAlign === 'center') {
    currentX = x - totalWidth / 2;
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

/**
 * Draw the NFT sale graphic to canvas and trigger download
 */
export async function exportNFTSaleToCanvas(nft: NFTHistory): Promise<void> {
  // Load image and ensure fonts are ready
  const [img] = await Promise.all([
    nft.imageUrl ? loadImage(nft.imageUrl) : Promise.resolve(null),
    ensureFontsLoaded(),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_WIDTH;
  canvas.height = EXPORT_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const brice = getFontFamily("--font-brice", "system-ui, sans-serif");
  const mundial = getFontFamily("--font-mundial", "system-ui, sans-serif");

  // Calculate profit/loss
  const profit = (nft.salePrice || 0) - nft.purchasePrice;
  const profitPercent = (profit / nft.purchasePrice) * 100;
  const isProfit = profit >= 0;

  // 1. Draw background
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);

  // 2. Draw subtle radial glow behind image area
  const glowCenterX = IMAGE_X + IMAGE_SIZE / 2;
  const glowCenterY = IMAGE_Y + IMAGE_SIZE / 2;
  const gradient = ctx.createRadialGradient(
    glowCenterX, glowCenterY, 0,
    glowCenterX, glowCenterY, IMAGE_SIZE * 0.7
  );
  gradient.addColorStop(0, "rgba(255, 224, 72, 0.08)");
  gradient.addColorStop(0.5, "rgba(255, 224, 72, 0.03)");
  gradient.addColorStop(1, "transparent");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, IMAGE_X + IMAGE_SIZE + 50, EXPORT_HEIGHT);

  // 3. Draw NFT image on the left
  if (img) {
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
    ctx.shadowBlur = 25;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;

    const radius = 16;
    ctx.beginPath();
    ctx.roundRect(IMAGE_X, IMAGE_Y, IMAGE_SIZE, IMAGE_SIZE, radius);
    ctx.clip();
    ctx.drawImage(img, IMAGE_X, IMAGE_Y, IMAGE_SIZE, IMAGE_SIZE);
    ctx.restore();
  } else {
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.roundRect(IMAGE_X, IMAGE_Y, IMAGE_SIZE, IMAGE_SIZE, 16);
    ctx.fill();

    ctx.fillStyle = COLORS.foregroundMuted;
    ctx.font = `bold 64px ${brice}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`#${nft.tokenId}`, IMAGE_X + IMAGE_SIZE / 2, IMAGE_Y + IMAGE_SIZE / 2);
  }

  // 4. Draw info on the right side - vertically centered as a block
  const infoCenterY = EXPORT_HEIGHT / 2;

  // "Citizen of Vibetown" brand text
  ctx.fillStyle = COLORS.brand;
  ctx.font = `bold 36px ${brice}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Citizen of Vibetown", INFO_CENTER_X, infoCenterY - 200);

  // Token ID
  ctx.fillStyle = COLORS.foreground;
  ctx.font = `bold 72px ${brice}`;
  ctx.fillText(`#${nft.tokenId}`, INFO_CENTER_X, infoCenterY - 120);

  // Horizontal accent line
  const lineWidth = 220;
  const lineGradient = ctx.createLinearGradient(INFO_CENTER_X - lineWidth/2, 0, INFO_CENTER_X + lineWidth/2, 0);
  lineGradient.addColorStop(0, "transparent");
  lineGradient.addColorStop(0.15, COLORS.brand);
  lineGradient.addColorStop(0.85, COLORS.brand);
  lineGradient.addColorStop(1, "transparent");
  ctx.strokeStyle = lineGradient;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(INFO_CENTER_X - lineWidth/2, infoCenterY - 50);
  ctx.lineTo(INFO_CENTER_X + lineWidth/2, infoCenterY - 50);
  ctx.stroke();

  // Purchase info
  ctx.fillStyle = COLORS.foregroundMuted;
  ctx.font = `400 20px ${mundial}`;
  ctx.fillText("PURCHASED FOR", INFO_CENTER_X, infoCenterY);

  ctx.fillStyle = COLORS.foreground;
  ctx.font = `bold 32px ${brice}`;
  fillTextWithSpacing(ctx, formatEthPrice(nft.purchasePrice), INFO_CENTER_X, infoCenterY + 40, 0.5);

  // Sale info
  ctx.fillStyle = COLORS.foregroundMuted;
  ctx.font = `400 20px ${mundial}`;
  ctx.fillText("SOLD FOR", INFO_CENTER_X, infoCenterY + 90);

  ctx.fillStyle = COLORS.brand;
  ctx.font = `bold 48px ${brice}`;
  fillTextWithSpacing(ctx, formatEthPrice(nft.salePrice || 0), INFO_CENTER_X, infoCenterY + 145, 0.5);

  // Profit/Loss
  ctx.fillStyle = isProfit ? COLORS.success : COLORS.danger;
  ctx.font = `bold 40px ${brice}`;
  fillTextWithSpacing(ctx, formatProfitLoss(profit), INFO_CENTER_X, infoCenterY + 210, 0.5);

  ctx.font = `bold 28px ${mundial}`;
  ctx.fillText(`(${formatPercent(profitPercent)})`, INFO_CENTER_X, infoCenterY + 250);

  // 5. GVC Branding watermark at bottom
  ctx.fillStyle = COLORS.brand;
  ctx.font = `bold 24px ${brice}`;
  ctx.textAlign = "right";
  ctx.fillText("Good Vibes Club", EXPORT_WIDTH - PADDING, EXPORT_HEIGHT - PADDING);

  // 6. Trigger download
  const timestamp = Date.now();
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `gvc-nft-sale-${nft.tokenId}-${timestamp}.png`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}
