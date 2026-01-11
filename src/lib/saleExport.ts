"use client";

import type { SaleRecord } from "@/types/api";

// Canvas dimensions for X/Twitter optimal image (16:9)
const EXPORT_WIDTH = 1200;
const EXPORT_HEIGHT = 675;

// Layout constants - side-by-side layout
const PADDING = 24;
const IMAGE_SIZE = EXPORT_HEIGHT - (PADDING * 2); // 627px - maximizes image
const IMAGE_X = PADDING;
const IMAGE_Y = PADDING;
const INFO_X = IMAGE_X + IMAGE_SIZE + 40; // Start of right panel
const INFO_WIDTH = EXPORT_WIDTH - INFO_X - PADDING;
const INFO_CENTER_X = INFO_X + INFO_WIDTH / 2;

// Colors
const COLORS = {
  background: "#0a0a0a",
  brand: "#ffe048",
  foreground: "#fafafa",
  foregroundMuted: "#a1a1aa",
  glow: "rgba(255, 224, 72, 0.15)",
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
 * Fetch OpenSea username for an address
 */
async function fetchOpenSeaUsername(address: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/opensea-user?address=${address}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.username || null;
  } catch {
    return null;
  }
}

/**
 * Format buyer for display - prefers OpenSea username
 */
function formatBuyerFallback(address: string): string {
  if (!address) return "Unknown";
  // If it looks like an ENS name, return as-is
  if (address.endsWith(".eth") || !address.startsWith("0x")) {
    return address;
  }
  // Truncate wallet address
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format USD price with proper formatting
 */
function formatUsdPrice(usd: number): string {
  if (usd >= 1000) {
    return `$${usd.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }
  return `$${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Draw the sale graphic to canvas and trigger download
 */
export async function exportSaleToCanvas(sale: SaleRecord): Promise<void> {
  // Fetch OpenSea username and load image in parallel
  const [openSeaUsername, img] = await Promise.all([
    fetchOpenSeaUsername(sale.buyer),
    loadImage(sale.imageUrl),
    ensureFontsLoaded(),
  ]);

  const buyerDisplay = openSeaUsername || formatBuyerFallback(sale.buyer);

  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_WIDTH;
  canvas.height = EXPORT_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const brice = getFontFamily("--font-brice", "system-ui, sans-serif");
  const mundial = getFontFamily("--font-mundial", "system-ui, sans-serif");

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
    ctx.fillText(`#${sale.tokenId}`, IMAGE_X + IMAGE_SIZE / 2, IMAGE_Y + IMAGE_SIZE / 2);
  }

  // 4. Draw info on the right side - vertically centered as a block
  const infoCenterY = EXPORT_HEIGHT / 2;

  // "Citizen of Vibetown" brand text
  ctx.fillStyle = COLORS.brand;
  ctx.font = `bold 36px ${brice}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Citizen of Vibetown", INFO_CENTER_X, infoCenterY - 175);

  // Token ID
  ctx.fillStyle = COLORS.foreground;
  ctx.font = `bold 72px ${brice}`;
  ctx.fillText(`#${sale.tokenId}`, INFO_CENTER_X, infoCenterY - 100);

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
  ctx.moveTo(INFO_CENTER_X - lineWidth/2, infoCenterY - 30);
  ctx.lineTo(INFO_CENTER_X + lineWidth/2, infoCenterY - 30);
  ctx.stroke();

  // "SOLD FOR" label
  ctx.fillStyle = COLORS.foregroundMuted;
  ctx.font = `400 20px ${mundial}`;
  ctx.fillText("SOLD FOR", INFO_CENTER_X, infoCenterY + 15);

  // Price in ETH - 1 decimal place
  ctx.fillStyle = COLORS.brand;
  ctx.font = `bold 54px ${brice}`;
  ctx.fillText(`${sale.priceEth.toFixed(1)} ETH`, INFO_CENTER_X, infoCenterY + 75);

  // Price in USD
  ctx.fillStyle = COLORS.foregroundMuted;
  ctx.font = `400 28px ${mundial}`;
  ctx.fillText(formatUsdPrice(sale.priceUsd), INFO_CENTER_X, infoCenterY + 120);

  // Buyer info
  ctx.fillStyle = COLORS.foregroundMuted;
  ctx.font = `400 24px ${mundial}`;
  ctx.fillText(`Bought by ${buyerDisplay}`, INFO_CENTER_X, infoCenterY + 175);

  // 5. Trigger download
  const timestamp = Date.now();
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `gvc-sale-${sale.tokenId}-${timestamp}.png`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}
