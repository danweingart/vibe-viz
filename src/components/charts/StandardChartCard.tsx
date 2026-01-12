"use client";

import { useRef, useMemo, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Card, CardHeader, CardDescription } from "@/components/ui";
import { ShareButton } from "@/components/charts/ShareButton";
import { ExportTemplate, CHART_WIDTH, CHART_HEIGHT } from "@/components/charts/ExportTemplate";
import type { LegendItem as ExportLegendItem, StatCardData } from "@/components/charts/ExportTemplate";

// Legend item for interactive toggles (on-screen)
export interface LegendItem {
  key: string;
  label: string;
  color: string;
  active?: boolean;
  value?: string;
}

export interface ChartExportConfig {
  title: string;
  subtitle: string;
  filename: string;
  legend?: ExportLegendItem[];
  statCards?: StatCardData[];
}

export interface StandardChartCardProps {
  // Required
  title: string;
  children: React.ReactNode;

  // Optional - display
  description?: string;
  href?: string; // Link to detail page
  badge?: React.ReactNode;

  // Optional - controls (placed outside export area)
  headerControls?: React.ReactNode; // View toggles placed in header near Share button
  controls?: React.ReactNode; // Additional controls in legend row (legacy)
  legend?: LegendItem[];
  onLegendToggle?: (key: string) => void;

  // Optional - stats (placed outside export area)
  stats?: React.ReactNode;

  // Optional - info panel (hidden from export)
  infoContent?: React.ReactNode;

  // Optional - export config
  exportConfig?: ChartExportConfig;

  /**
   * Render function for export - renders chart at export dimensions.
   * Required for PNG export.
   */
  renderChart?: (width: number, height: number) => React.ReactNode;

  // Optional - loading/error states
  isLoading?: boolean;
  error?: Error | null;
  isEmpty?: boolean;
  emptyMessage?: string;

  // Optional - styling
  className?: string;
}

export function StandardChartCard({
  title,
  children,
  description,
  href,
  badge,
  headerControls,
  controls,
  legend,
  onLegendToggle,
  stats,
  infoContent,
  exportConfig,
  renderChart,
  isLoading,
  error,
  isEmpty,
  emptyMessage = "No data available",
  className,
}: StandardChartCardProps) {
  const exportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportReady, setExportReady] = useState(false);
  const resolveRef = useRef<((el: HTMLDivElement | null) => void) | null>(null);

  // When export container mounts, wait for render then resolve
  useEffect(() => {
    if (isExporting && exportRef.current) {
      // Wait for Recharts to fully render (needs more time for SVG generation)
      const timer = setTimeout(() => {
        setExportReady(true);
        if (resolveRef.current) {
          resolveRef.current(exportRef.current);
          resolveRef.current = null;
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isExporting]);

  // Trigger export and return the container element
  const getExportElement = useCallback((): Promise<HTMLDivElement | null> => {
    if (!renderChart || !exportConfig) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setExportReady(false);
      setIsExporting(true);
    });
  }, [renderChart, exportConfig]);

  // Clean up after export
  const finishExport = useCallback(() => {
    setIsExporting(false);
    setExportReady(false);
  }, []);

  // Convert legend items for export format
  const exportLegend = useMemo((): ExportLegendItem[] => {
    if (exportConfig?.legend) return exportConfig.legend;
    if (!legend) return [];
    return legend
      .filter((item) => item.active !== false)
      .map((item) => ({
        color: item.color,
        label: item.label,
        value: item.value || "",
      }));
  }, [legend, exportConfig?.legend]);

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <span className="text-lg font-bold font-brice">{title}</span>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
        </CardHeader>
        <div className="m-3 rounded-lg chart-skeleton min-h-[320px] sm:min-h-[400px]" />
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <span className="text-lg font-bold font-brice">{title}</span>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
        </CardHeader>
        <div className="m-3 rounded-lg bg-background-secondary flex flex-col items-center justify-center min-h-[320px] sm:min-h-[400px]">
          <ErrorIcon className="w-12 h-12 text-danger mb-4" />
          <p className="text-foreground-muted text-sm">Failed to load data</p>
          <p className="text-foreground-muted text-xs mt-1 opacity-60">{error.message}</p>
        </div>
      </Card>
    );
  }

  // Empty state
  if (isEmpty) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            {href ? (
              <Link
                href={href}
                className="text-lg font-bold text-foreground font-brice hover:text-brand transition-colors"
              >
                {title}
              </Link>
            ) : (
              <span className="text-lg font-bold font-brice">{title}</span>
            )}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
        </CardHeader>
        <div className="m-3 rounded-lg bg-background-secondary chart-skeleton-static flex flex-col items-center justify-center min-h-[320px] sm:min-h-[400px]">
          <ChartIcon className="w-12 h-12 text-muted mb-4 opacity-40" />
          <p className="text-foreground-muted text-sm">{emptyMessage}</p>
        </div>
      </Card>
    );
  }

  // Main render
  return (
    <Card className={className}>
      {/* Header */}
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {href ? (
              <Link
                href={href}
                className="text-lg font-bold text-foreground font-brice hover:text-brand transition-colors"
              >
                {title}
              </Link>
            ) : (
              <span className="text-lg font-bold font-brice">{title}</span>
            )}
            {badge}
          </div>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <div className="flex items-center gap-2">
          {headerControls}
          {exportConfig && renderChart && (
            <ShareButton
              getExportElement={getExportElement}
              finishExport={finishExport}
              config={exportConfig}
            />
          )}
        </div>
      </CardHeader>

      {/* Legend row */}
      {legend && (
        <div className={`flex items-center px-3 mb-3 gap-4 ${controls ? "justify-between" : "justify-center"}`}>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {legend.map((item) => (
              <button
                key={item.key}
                onClick={() => onLegendToggle?.(item.key)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-full border border-border text-xs transition-all
                  ${item.active !== false ? "bg-background-tertiary" : "opacity-50 text-foreground-muted"}
                  ${onLegendToggle ? "hover:bg-background-tertiary cursor-pointer" : "cursor-default"}
                `}
                disabled={!onLegendToggle}
                type="button"
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="font-mundial">{item.label}</span>
              </button>
            ))}
          </div>
          {controls && <div className="flex items-center gap-2">{controls}</div>}
        </div>
      )}

      {/* Info panel */}
      {infoContent && <div className="px-3 mb-3">{infoContent}</div>}

      {/* Chart content */}
      <div className="p-3 bg-background-secondary rounded-lg mx-3 mb-3">
        <div className="h-[280px] sm:h-[360px]">{children}</div>
      </div>

      {/* Stats grid */}
      {stats}

      {/* Export overlay + template */}
      {isExporting && typeof document !== "undefined" && createPortal(
        <>
          {/* Export template rendered behind overlay */}
          <div
            ref={exportRef}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              zIndex: 99998,
            }}
          >
            <ExportTemplate
              title={exportConfig?.title || title}
              subtitle={exportConfig?.subtitle || ""}
              legend={exportLegend}
              statCards={exportConfig?.statCards}
            >
              {renderChart && renderChart(CHART_WIDTH, CHART_HEIGHT)}
            </ExportTemplate>
          </div>
          {/* Full-screen overlay to hide the export render */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "#0a0a0a",
              zIndex: 99999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div className="text-foreground-muted text-sm">Generating image...</div>
          </div>
        </>,
        document.body
      )}
    </Card>
  );
}

// Error icon
function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

// Chart icon for empty state
function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
}
