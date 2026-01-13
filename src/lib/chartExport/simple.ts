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
 * Share via Web Share API (native share sheet)
 * Returns true if successful or user cancelled, false if not supported
 */
export async function shareViaWebShare(dataUrl: string): Promise<boolean> {
  // Check if Web Share API is available
  if (!navigator.share || !navigator.canShare) {
    return false;
  }

  try {
    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const file = new File([blob], "chart.png", { type: "image/png" });

    const shareData = { files: [file] };

    // Check if we can share files
    if (!navigator.canShare(shareData)) {
      return false;
    }

    await navigator.share(shareData);
    return true;
  } catch (err) {
    // User cancelled is still considered success (they interacted with the share sheet)
    if ((err as Error).name === "AbortError") {
      return true;
    }
    console.error("Failed to share via Web Share API:", err);
    return false;
  }
}

/**
 * Share to X/Twitter with image in clipboard (legacy)
 */
export async function shareToX(
  element: HTMLElement,
  title: string
): Promise<void> {
  try {
    // Wait for any pending renders
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Capture as PNG blob
    const dataUrl = await toPng(element, {
      pixelRatio: 2,
      backgroundColor: "#0a0a0a",
    });

    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Try Web Share API first (mobile)
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], "chart.png", { type: "image/png" });
      const shareData = {
        text: `${title} - Good Vibes Club Analytics\n\n#GoodVibesClub #NFT`,
        url: "https://goodvibesclub.io",
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

    // Fallback: Copy to clipboard and open X
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);

      const tweetText = encodeURIComponent(
        `${title} - Good Vibes Club Analytics\n\n#GoodVibesClub #NFT\n\nhttps://goodvibesclub.io`
      );
      window.open(`https://twitter.com/intent/tweet?text=${tweetText}`, "_blank");
      alert("Image copied to clipboard! Paste it into your tweet.");
    } catch {
      // Just open X if clipboard fails
      const tweetText = encodeURIComponent(
        `${title} - Good Vibes Club Analytics\n\n#GoodVibesClub #NFT\n\nhttps://goodvibesclub.io`
      );
      window.open(`https://twitter.com/intent/tweet?text=${tweetText}`, "_blank");
    }
  } catch (error) {
    console.error("Failed to share:", error);
    throw error;
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
