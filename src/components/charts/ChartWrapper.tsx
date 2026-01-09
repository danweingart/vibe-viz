"use client";

import { useRef, useState, useCallback } from "react";
import { exportChartForX, getChartFilename } from "@/lib/chartExport";
import { Card, CardHeader, CardTitle, CardDescription, Button } from "@/components/ui";

interface ChartWrapperProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function ChartWrapper({
  title,
  description,
  children,
  className,
}: ChartWrapperProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!chartRef.current) return;

    setIsExporting(true);
    try {
      await exportChartForX(chartRef.current, {
        filename: getChartFilename(title.toLowerCase().replace(/\s+/g, "-")),
      });
    } catch (error) {
      console.error("Failed to export chart:", error);
    } finally {
      setIsExporting(false);
    }
  }, [title]);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownload}
          isLoading={isExporting}
          className="flex-shrink-0"
        >
          <DownloadIcon className="w-4 h-4 mr-1" />
          Share
        </Button>
      </CardHeader>

      {/* Exportable chart area */}
      <div
        ref={chartRef}
        className="chart-export-container relative"
        style={{ minHeight: "300px" }}
      >
        {/* Watermark for exports - hidden in UI, visible in export */}
        <div className="chart-watermark absolute bottom-2 right-2 text-xs text-foreground-muted opacity-0 pointer-events-none">
          Good Vibes Club Analytics
        </div>
        {children}
      </div>
    </Card>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  );
}
