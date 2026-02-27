import { toPng } from "html-to-image";

const BACKGROUND_COLOR = "#0a0a0a";

/**
 * Pre-process all Recharts SVGs: inline computed styles on every child
 * element so they survive html-to-image's cloneNode(true) (which skips
 * per-child style decoration for SVG subtrees). Returns a restore fn.
 */
function prepareSvgsForExport(root: HTMLElement): () => void {
  const svgs = Array.from(root.querySelectorAll("svg.recharts-surface"));
  const savedStyles: Map<Element, string | null>[] = [];

  svgs.forEach((svg) => {
    const saved = new Map<Element, string | null>();
    const allElements = svg.querySelectorAll("*");

    allElements.forEach((el) => {
      if (!(el instanceof SVGElement) && !(el instanceof HTMLElement)) return;

      // Save original inline style
      saved.set(el, el.getAttribute("style"));

      // Copy all computed styles to inline
      const computed = window.getComputedStyle(el);
      for (let i = 0; i < computed.length; i++) {
        const prop = computed[i];
        el.style.setProperty(prop, computed.getPropertyValue(prop));
      }
    });

    savedStyles.push(saved);
  });

  return () => {
    savedStyles.forEach((saved) => {
      saved.forEach((originalStyle, el) => {
        if (originalStyle !== null) {
          el.setAttribute("style", originalStyle);
        } else {
          el.removeAttribute("style");
        }
      });
    });
  };
}

/**
 * Generate a PNG data URL from a DOM element.
 *
 * Inlines computed styles on Recharts SVG children before capture so
 * html-to-image's cloneNode(true) preserves all visual content
 * including data labels, then restores original styles.
 */
export async function generatePngDataUrl(element: HTMLElement): Promise<string> {
  const restore = prepareSvgsForExport(element);

  try {
    // Capture the chart as-is (no DOM changes, labels intact)
    // Filter out elements marked with data-export-exclude (e.g. Export button, view toggles)
    const chartDataUrl = await toPng(element, {
      pixelRatio: 2,
      backgroundColor: BACKGROUND_COLOR,
      filter: (node: HTMLElement) => {
        return !node.dataset?.exportExclude;
      },
    });

    // Composite branding bar on top via Canvas
    return await addBrandingBar(chartDataUrl);
  } finally {
    restore();
  }
}

const BRANDING_BAR_HEIGHT = 40; // pixels in final image (before pixelRatio)
const BRAND_TEXT = "Good Vibes Club";
const BRAND_COLOR = "#ffe048";
const BRAND_FONT = "bold 20px 'Brice-Bold', 'Arial Black', sans-serif";

/**
 * Add a branding bar to the top of an image using Canvas.
 * This avoids modifying the DOM (which causes Recharts to re-render and drop labels).
 */
async function addBrandingBar(chartDataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const barHeight = BRANDING_BAR_HEIGHT * 2; // account for 2x pixelRatio
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height + barHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(chartDataUrl); // fallback: return without branding
        return;
      }

      // Draw background for branding bar
      ctx.fillStyle = BACKGROUND_COLOR;
      ctx.fillRect(0, 0, canvas.width, barHeight);

      // Draw border line at bottom of branding bar
      ctx.strokeStyle = "#222222";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, barHeight - 0.5);
      ctx.lineTo(canvas.width, barHeight - 0.5);
      ctx.stroke();

      // Draw brand text centered
      ctx.fillStyle = BRAND_COLOR;
      ctx.font = BRAND_FONT;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(BRAND_TEXT, canvas.width / 2, barHeight / 2);

      // Draw the chart image below the branding bar
      ctx.drawImage(img, 0, barHeight);

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Failed to load chart image for branding"));
    img.src = chartDataUrl;
  });
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
