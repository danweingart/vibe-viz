"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui";
import { exportChartToCanvas, shareChartToX, ChartExportConfig } from "@/lib/chartExport/index";

interface ChartExportButtonsProps {
  chartRef: React.RefObject<HTMLDivElement | null>;
  config: ChartExportConfig;
}

export function ChartExportButtons({ chartRef, config }: ChartExportButtonsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!chartRef.current) return;
    setIsExporting(true);
    try {
      await exportChartToCanvas(chartRef.current, config);
    } catch (error) {
      console.error("Failed to export:", error);
    } finally {
      setIsExporting(false);
    }
  }, [chartRef, config]);

  const handleShare = useCallback(async () => {
    if (!chartRef.current) return;
    setIsSharing(true);
    try {
      await shareChartToX(chartRef.current, config);
    } catch (error) {
      console.error("Failed to share:", error);
    } finally {
      setIsSharing(false);
    }
  }, [chartRef, config]);

  return (
    <div className="flex items-center gap-2 sm:gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleShare}
        isLoading={isSharing}
        aria-label="Share chart to X"
      >
        <XIcon className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDownload}
        isLoading={isExporting}
        aria-label="Download chart as PNG"
      >
        <DownloadIcon className="w-4 h-4" />
      </Button>
    </div>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
