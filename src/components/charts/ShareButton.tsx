"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui";
import { exportChartToCanvas, shareChartToX, ChartExportConfig } from "@/lib/chartExport/index";

interface ShareButtonProps {
  chartRef: React.RefObject<HTMLDivElement | null>;
  config: ChartExportConfig;
}

export function ShareButton({ chartRef, config }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const handleDownload = useCallback(async () => {
    if (!chartRef.current) return;
    setIsExporting(true);
    try {
      await exportChartToCanvas(chartRef.current, config);
    } catch (error) {
      console.error("Failed to export:", error);
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  }, [chartRef, config]);

  const handleShareToX = useCallback(async () => {
    if (!chartRef.current) return;
    setIsSharing(true);
    try {
      await shareChartToX(chartRef.current, config);
    } catch (error) {
      console.error("Failed to share:", error);
    } finally {
      setIsSharing(false);
      setIsOpen(false);
    }
  }, [chartRef, config]);

  const isLoading = isExporting || isSharing;

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Share chart"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="flex items-center gap-1"
      >
        <ShareIcon className="w-4 h-4" />
        <span className="hidden sm:inline text-xs">Share</span>
        <ChevronIcon className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </Button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 w-40 bg-background-secondary border border-border rounded-lg shadow-lg z-50 overflow-hidden"
          role="menu"
        >
          <button
            onClick={handleDownload}
            disabled={isLoading}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-background-tertiary transition-colors disabled:opacity-50"
            role="menuitem"
          >
            {isExporting ? (
              <LoadingSpinner className="w-4 h-4" />
            ) : (
              <DownloadIcon className="w-4 h-4" />
            )}
            <span>Download PNG</span>
          </button>
          <button
            onClick={handleShareToX}
            disabled={isLoading}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-background-tertiary transition-colors disabled:opacity-50"
            role="menuitem"
          >
            {isSharing ? (
              <LoadingSpinner className="w-4 h-4" />
            ) : (
              <XIcon className="w-4 h-4" />
            )}
            <span>Share to X</span>
          </button>
        </div>
      )}
    </div>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
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

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
