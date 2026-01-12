"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EXPORT_WIDTH, EXPORT_HEIGHT, HEADER_HEIGHT, LEGEND_HEIGHT, STAT_CARDS_HEIGHT, CHART_MARGIN, CHART_TOP } from "./types";

// Calculate export chart dimensions to match canvas rendering in index.ts
// Chart area: from CHART_TOP (178px) to chartBottom (1252px when stat cards present)
const CHART_EXPORT_WIDTH = EXPORT_WIDTH - CHART_MARGIN * 2; // 1064px
const CHART_EXPORT_HEIGHT = EXPORT_HEIGHT - STAT_CARDS_HEIGHT - CHART_MARGIN - CHART_TOP; // 1074px

export interface ExportChartRendererProps {
  /** Function that renders the chart - receives width and height */
  renderChart: (width: number, height: number) => React.ReactNode;
  /** Whether export is in progress */
  isExporting: boolean;
  /** Callback when the chart SVG is ready for capture */
  onReady: (container: HTMLDivElement) => void;
}

/**
 * Renders a chart at export dimensions in an off-screen container.
 * Used to capture high-quality SVG for PNG export.
 */
export function ExportChartRenderer({
  renderChart,
  isExporting,
  onReady,
}: ExportChartRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  // Only mount when exporting
  useEffect(() => {
    if (isExporting) {
      setMounted(true);
    } else {
      setMounted(false);
    }
  }, [isExporting]);

  // Notify when chart is ready (after render completes)
  useEffect(() => {
    if (mounted && containerRef.current) {
      // Wait for Recharts to render the SVG
      const timer = setTimeout(() => {
        if (containerRef.current) {
          onReady(containerRef.current);
        }
      }, 100); // Give Recharts time to render

      return () => clearTimeout(timer);
    }
  }, [mounted, onReady]);

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  // Render in a portal to avoid layout interference
  return createPortal(
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        left: "-9999px",
        top: 0,
        width: CHART_EXPORT_WIDTH,
        height: CHART_EXPORT_HEIGHT,
        backgroundColor: "#0a0a0a",
        overflow: "hidden",
        // Ensure fonts and styles are inherited
        fontFamily: "var(--font-mundial)",
      }}
      className="export-chart-renderer"
    >
      {renderChart(CHART_EXPORT_WIDTH, CHART_EXPORT_HEIGHT)}
    </div>,
    document.body
  );
}

// Export dimensions for use in chart components
export { CHART_EXPORT_WIDTH, CHART_EXPORT_HEIGHT };
