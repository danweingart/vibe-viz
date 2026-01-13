"use client";

import Link from "next/link";
import { CHART_HEADER, SPACING, TEXT_STYLES } from "@/lib/tokens";

export interface ChartHeaderProps {
  /** Chart title */
  title: string;
  /** Optional description/subtitle */
  description?: string;
  /** Optional link for title */
  href?: string;
  /** Optional badge to show next to title */
  badge?: React.ReactNode;
  /** Optional controls slot (right side) */
  controls?: React.ReactNode;
  /** Optional className */
  className?: string;
}

/**
 * Standardized chart header component
 *
 * Features:
 * - Title in Brice Bold (16px)
 * - Optional description in Mundial (13px muted)
 * - Optional link wrapper for title
 * - Optional controls slot (right-aligned)
 * - Uses GVC design tokens for consistent styling
 */
export function ChartHeader({
  title,
  description,
  href,
  badge,
  controls,
  className = "",
}: ChartHeaderProps) {
  const titleContent = (
    <span
      className="font-brice font-bold text-foreground"
      style={{
        fontSize: CHART_HEADER.title.fontSize,
        lineHeight: CHART_HEADER.title.lineHeight,
      }}
    >
      {title}
    </span>
  );

  return (
    <div
      className={`flex flex-row items-start justify-between ${className}`}
      style={{ marginBottom: CHART_HEADER.marginBottom }}
    >
      {/* Left side: title, badge, description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center" style={{ gap: SPACING.sectionGap }}>
          {href ? (
            <Link
              href={href}
              className="hover:text-brand transition-colors"
            >
              {titleContent}
            </Link>
          ) : (
            titleContent
          )}
          {badge}
        </div>

        {description && (
          <p
            className="font-mundial text-foreground-muted"
            style={{
              fontSize: CHART_HEADER.description.fontSize,
              lineHeight: CHART_HEADER.description.lineHeight,
              marginTop: CHART_HEADER.description.marginTop,
            }}
          >
            {description}
          </p>
        )}
      </div>

      {/* Right side: controls */}
      {controls && (
        <div
          className="flex items-center flex-shrink-0"
          style={{ gap: CHART_HEADER.controls.gap }}
        >
          {controls}
        </div>
      )}
    </div>
  );
}

export default ChartHeader;
