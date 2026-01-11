"use client";

import { useRef, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardHeader, CardDescription } from "@/components/ui";
import { ChartExportButtons } from "@/components/charts/ChartExportButtons";
import type { ChartExportConfig, LegendItem as ExportLegendItem } from "@/lib/chartExport/types";
import { EXPORT_BRANDING } from "@/lib/chartConfig";

// Legend item for interactive toggles (on-screen)
export interface LegendItem {
  key: string;
  label: string;
  color: string;
  active?: boolean;
  value?: string;
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
  controls?: React.ReactNode; // View toggles, comparison buttons
  legend?: LegendItem[];
  onLegendToggle?: (key: string) => void;

  // Optional - stats (placed outside export area)
  stats?: React.ReactNode;

  // Optional - info panel (hidden from export)
  infoContent?: React.ReactNode;

  // Optional - export config
  exportConfig?: ChartExportConfig;

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
  controls,
  legend,
  onLegendToggle,
  stats,
  infoContent,
  exportConfig,
  isLoading,
  error,
  isEmpty,
  emptyMessage = "No data available",
  className,
}: StandardChartCardProps) {
  const chartRef = useRef<HTMLDivElement>(null);

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

  const finalExportConfig = useMemo((): ChartExportConfig | undefined => {
    if (!exportConfig) return undefined;
    return {
      ...exportConfig,
      legend: exportLegend,
    };
  }, [exportConfig, exportLegend]);

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
        <div
          className="m-3 rounded-lg chart-skeleton min-h-[320px] sm:min-h-[400px]"
        />
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
          <p className="text-foreground-muted text-xs mt-1 opacity-60">
            {error.message}
          </p>
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
      {/* Header - VISIBLE ON SCREEN ONLY (excluded from export via CardHeader being outside chartRef) */}
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
        {finalExportConfig && (
          <ChartExportButtons chartRef={chartRef} config={finalExportConfig} />
        )}
      </CardHeader>

      {/* Controls row - OUTSIDE chartRef, excluded from export */}
      {(controls || legend) && (
        <div className="flex items-center justify-between px-3 mb-3 gap-4">
          {legend && (
            <div className="flex items-center gap-2 flex-wrap">
              {legend.map((item) => (
                <button
                  key={item.key}
                  onClick={() => onLegendToggle?.(item.key)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-full border border-border text-xs transition-all
                    ${
                      item.active !== false
                        ? "bg-background-tertiary"
                        : "opacity-50 text-foreground-muted"
                    }
                    ${onLegendToggle ? "hover:bg-background-tertiary cursor-pointer" : "cursor-default"}
                  `}
                  disabled={!onLegendToggle}
                  type="button"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-mundial">{item.label}</span>
                </button>
              ))}
            </div>
          )}
          {controls && <div className="flex items-center gap-2">{controls}</div>}
        </div>
      )}

      {/* Info panel - OUTSIDE chartRef, hidden from export */}
      {infoContent && (
        <div className="px-3 mb-3 export-hide">{infoContent}</div>
      )}

      {/* Chart content - THIS GETS EXPORTED AT 1080x1350 */}
      <div
        ref={chartRef}
        className="p-3 bg-background-secondary rounded-lg chart-container flex-1 flex flex-col mx-3 mb-3"
      >
        {/* Export-only branding header - HIDDEN ON SCREEN */}
        <div className="export-only hidden flex-col items-center py-4 border-b border-border mb-4">
          <div className="flex items-center gap-4">
            <Image
              src={EXPORT_BRANDING.header.logoPath}
              alt="Good Vibes Club"
              width={EXPORT_BRANDING.header.logoSize}
              height={EXPORT_BRANDING.header.logoSize}
              className="object-contain"
            />
            <span
              className="font-brice text-brand"
              style={{ fontSize: EXPORT_BRANDING.header.brandFontSize }}
            >
              {EXPORT_BRANDING.header.brandText}
            </span>
          </div>
          <h2
            className="font-brice text-foreground mt-2"
            style={{ fontSize: EXPORT_BRANDING.header.titleFontSize }}
          >
            {exportConfig?.title || title}
          </h2>
          {exportConfig?.subtitle && (
            <p
              className="text-foreground-muted font-mundial mt-1"
              style={{ fontSize: EXPORT_BRANDING.header.subtitleFontSize }}
            >
              {exportConfig.subtitle}
            </p>
          )}
        </div>

        {/* Export-only legend bar - HIDDEN ON SCREEN */}
        {exportLegend.length > 0 && (
          <div className="export-only hidden items-center justify-center gap-6 py-3 bg-background-tertiary rounded-lg mb-4">
            {exportLegend.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-foreground-muted font-mundial text-sm">
                  {item.label}
                </span>
                {item.value && (
                  <span
                    className="font-mundial font-bold text-sm"
                    style={{ color: item.color }}
                  >
                    {item.value}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Chart visualization - responsive height for on-screen display */}
        <div className="flex-1 min-h-[280px] sm:min-h-[360px]">
          {children}
        </div>
      </div>

      {/* Stats grid - OUTSIDE chartRef, excluded from export */}
      {stats}
    </Card>
  );
}

// Error icon
function ErrorIcon({ className }: { className?: string }) {
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
        strokeWidth={1.5}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

// Chart icon for empty state
function ChartIcon({ className }: { className?: string }) {
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
        strokeWidth={1.5}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
}
