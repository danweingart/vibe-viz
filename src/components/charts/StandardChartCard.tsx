"use client";

import { useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardDescription } from "@/components/ui";
import { ShareButton } from "@/components/charts/ShareButton";
import { ExportBrandingBar } from "@/components/charts/ExportBrandingBar";
import { ChartLegend } from "@/components/charts/ChartLegend";
import { SPACING, TEXT_STYLES } from "@/lib/tokens";

// Legend item for interactive toggles (on-screen)
export interface LegendItem {
  key: string;
  label: string;
  color: string;
  active?: boolean;
  value?: string;
  lineStyle?: "dot" | "solid" | "dashed"; // Indicator style
}

export interface ChartExportConfig {
  title: string;
  filename: string;
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

  // Optional - stats (placed inside the 1:1 tile)
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
  headerControls,
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
  const cardRef = useRef<HTMLDivElement>(null);
  const [showBranding, setShowBranding] = useState(false);
  const resolveRef = useRef<((el: HTMLDivElement | null) => void) | null>(null);

  // Trigger export and return the card element
  const getExportElement = useCallback((): Promise<HTMLDivElement | null> => {
    if (!cardRef.current || !exportConfig) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setShowBranding(true);
      // Wait for branding bar to render
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (resolveRef.current) {
            resolveRef.current(cardRef.current);
            resolveRef.current = null;
          }
        }, 100);
      });
    });
  }, [exportConfig]);

  // Clean up after export
  const finishExport = useCallback(() => {
    setShowBranding(false);
  }, []);

  // Title element (shared across states)
  const titleElement = href ? (
    <Link
      href={href}
      className="hover:text-brand transition-colors"
      style={{
        fontSize: TEXT_STYLES.cardTitle.fontSize,
        fontWeight: TEXT_STYLES.cardTitle.fontWeight,
        fontFamily: TEXT_STYLES.cardTitle.fontFamily,
        lineHeight: TEXT_STYLES.cardTitle.lineHeight,
      }}
    >
      {title}
    </Link>
  ) : (
    <span
      className="font-brice font-bold text-foreground"
      style={{
        fontSize: TEXT_STYLES.cardTitle.fontSize,
        lineHeight: TEXT_STYLES.cardTitle.lineHeight,
      }}
    >
      {title}
    </span>
  );

  // Base card styles - no aspect ratio constraint for V2
  const cardClasses = `flex flex-col overflow-hidden ${className || ""}`;

  // Loading state
  if (isLoading) {
    return (
      <Card className={cardClasses}>
        <div className="flex flex-row items-start justify-between p-3">
          <div>
            {titleElement}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
        </div>
        <div className="h-[400px] m-3 mt-0 rounded-lg chart-skeleton" />
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={cardClasses}>
        <div className="flex flex-row items-start justify-between p-3">
          <div>
            {titleElement}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
        </div>
        <div className="flex-1 m-3 mt-0 rounded-lg bg-background-secondary flex flex-col items-center justify-center">
          <ErrorIcon className="w-10 h-10 text-danger mb-3" />
          <p className="text-foreground-muted text-sm">Failed to load data</p>
          <p className="text-foreground-muted text-xs mt-1 opacity-60">{error.message}</p>
        </div>
      </Card>
    );
  }

  // Empty state
  if (isEmpty) {
    return (
      <Card className={cardClasses}>
        <div className="flex flex-row items-start justify-between p-3">
          <div>
            {titleElement}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
        </div>
        <div className="flex-1 m-3 mt-0 rounded-lg bg-background-secondary chart-skeleton-static flex flex-col items-center justify-center">
          <ChartIcon className="w-10 h-10 text-muted mb-3 opacity-40" />
          <p className="text-foreground-muted text-sm">{emptyMessage}</p>
        </div>
      </Card>
    );
  }

  // Main render - 1:1 aspect ratio card
  return (
    <div ref={cardRef}>
    <Card className={cardClasses}>
      {/* Export branding bar - only visible during export, at top */}
      <ExportBrandingBar visible={showBranding} />

      {/* Header - compact */}
      <div className="flex flex-row items-start justify-between p-3 pb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {titleElement}
            {badge}
          </div>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <div className="flex items-center gap-2">
          {/* Hide toggle controls during export */}
          {headerControls && (
            <div className={showBranding ? "hidden" : ""}>
              {headerControls}
            </div>
          )}
          {exportConfig && (
            <div className={showBranding ? "invisible" : ""}>
              <ShareButton
                getExportElement={getExportElement}
                finishExport={finishExport}
                config={exportConfig}
              />
            </div>
          )}
        </div>
      </div>

      {/* Legend row - compact */}
      {legend && (
        <div
          className={`flex items-center px-3 pb-2 ${controls ? "justify-between" : "justify-center"}`}
          style={{ gap: SPACING.sectionGap }}
        >
          <ChartLegend
            items={legend}
            onToggle={onLegendToggle}
            size="sm"
          />
          {controls && (
            <div className="flex items-center gap-2">
              {controls}
            </div>
          )}
        </div>
      )}

      {/* Info panel - compact */}
      {infoContent && (
        <div className="px-3 pb-2">
          <div className="p-2 rounded-lg bg-background-tertiary border border-border text-xs text-foreground-muted">
            {infoContent}
          </div>
        </div>
      )}

      {/* Chart content - fixed height for V2 */}
      <div className="px-3">
        <div className="h-[400px] bg-background-secondary rounded-lg overflow-hidden">
          {children}
        </div>
      </div>

      {/* Stats grid - compact, inside the 1:1 tile */}
      {stats && (
        <div className="p-3 pt-2">
          {stats}
        </div>
      )}
    </Card>
    </div>
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
