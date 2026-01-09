"use client";

import { useRef, useState, useCallback } from "react";
import { exportChartForX, getChartFilename } from "@/lib/chartExport";
import { Card, CardHeader, CardTitle, CardDescription, Button } from "@/components/ui";

interface ExportableChartProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  controls?: React.ReactNode;
  className?: string;
}

export function ExportableChart({
  title,
  description,
  children,
  controls,
  className,
}: ExportableChartProps) {
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
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <div className="flex items-center gap-2">
          {controls}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            isLoading={isExporting}
            title="Download for X/Twitter"
          >
            <DownloadIcon className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      {/* Exportable chart area */}
      <div
        ref={chartRef}
        className="relative bg-background-secondary rounded-lg"
      >
        {/* Brand header for exports */}
        <div className="export-header hidden absolute top-0 left-0 right-0 p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-brand flex items-center justify-center">
              <span className="text-sm">✨</span>
            </div>
            <div>
              <p className="font-brice text-foreground text-sm">Good Vibes Club</p>
              <p className="text-xs text-foreground-muted">{title}</p>
            </div>
          </div>
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
