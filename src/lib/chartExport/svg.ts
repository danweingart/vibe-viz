/**
 * Extract the Recharts SVG element from a container
 */
export function extractChartSVG(container: HTMLElement): SVGElement | null {
  return container.querySelector(".recharts-wrapper svg");
}

/**
 * Get resolved font-family from CSS variable
 */
function getResolvedFont(cssVar: string): string {
  if (typeof document === "undefined") return "system-ui, sans-serif";
  const value = getComputedStyle(document.body).getPropertyValue(cssVar).trim();
  return value || "system-ui, sans-serif";
}

export interface SvgToImageOptions {
  /** If true, the SVG is already rendered at export dimensions (from off-screen render) */
  alreadyAtTargetDimensions?: boolean;
}

/**
 * Convert an SVG element to an HTMLImageElement at specified dimensions
 * Renders at 2x resolution for crispness
 */
export async function svgToImage(
  svg: SVGElement,
  targetWidth: number,
  targetHeight: number,
  options?: SvgToImageOptions
): Promise<HTMLImageElement> {
  // Clone the SVG to avoid modifying the original
  const clonedSvg = svg.cloneNode(true) as SVGElement;

  // Get original dimensions
  const originalWidth = svg.clientWidth || parseInt(svg.getAttribute("width") || "0");
  const originalHeight = svg.clientHeight || parseInt(svg.getAttribute("height") || "0");

  if (options?.alreadyAtTargetDimensions) {
    // SVG is already at export dimensions - just set the size directly
    clonedSvg.setAttribute("width", String(targetWidth));
    clonedSvg.setAttribute("height", String(targetHeight));
    clonedSvg.setAttribute("viewBox", `0 0 ${originalWidth} ${originalHeight}`);
  } else {
    // Scale to fit within target area without cropping
    // preserveAspectRatio="xMidYMid meet" scales to fit and centers
    clonedSvg.setAttribute("width", String(targetWidth));
    clonedSvg.setAttribute("height", String(targetHeight));
    clonedSvg.setAttribute("viewBox", `0 0 ${originalWidth} ${originalHeight}`);
    clonedSvg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  }

  // Resolve CSS variables in font-family attributes
  const mundialFont = getResolvedFont("--font-mundial");
  const briceFont = getResolvedFont("--font-brice");

  // Replace CSS variables in all text elements
  const textElements = clonedSvg.querySelectorAll("text, tspan");
  textElements.forEach((el) => {
    const fontFamily = el.getAttribute("font-family") || "";
    if (fontFamily.includes("var(--font-mundial)")) {
      el.setAttribute("font-family", mundialFont);
    } else if (fontFamily.includes("var(--font-brice)")) {
      el.setAttribute("font-family", briceFont);
    } else if (!fontFamily || fontFamily === "sans-serif") {
      // Default to Mundial for chart text
      el.setAttribute("font-family", mundialFont);
    }
  });

  // Serialize SVG to string
  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(clonedSvg);

  // Ensure proper XML declaration and namespace
  if (!svgString.includes("xmlns=")) {
    svgString = svgString.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  // Also replace any remaining CSS variable references in the string
  svgString = svgString.replace(/var\(--font-mundial\)/g, mundialFont);
  svgString = svgString.replace(/var\(--font-brice\)/g, briceFont);

  // Create a data URL from the SVG
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  // Load SVG as image at 2x resolution for crispness
  const img = await loadImage(url);
  URL.revokeObjectURL(url);

  return img;
}

/**
 * Load an image from a URL
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
