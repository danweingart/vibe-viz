"use client";

import { useState } from "react";

interface ChartInfoPanelProps {
  title?: string;
  children: React.ReactNode;
  expandable?: boolean;
  defaultExpanded?: boolean;
  className?: string;
}

/**
 * Info panel for metric definitions and contextual information.
 * Always hidden from export via export-hide class.
 */
export function ChartInfoPanel({
  title = "About this chart",
  children,
  expandable = true,
  defaultExpanded = false,
  className = "",
}: ChartInfoPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!expandable) {
    return (
      <div
        className={`export-hide bg-background-secondary rounded-lg p-3 ${className}`}
      >
        {title && (
          <h4 className="text-xs font-bold font-brice text-foreground-muted mb-2 uppercase tracking-wide">
            {title}
          </h4>
        )}
        <div className="text-sm text-foreground-muted font-mundial leading-relaxed">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`export-hide bg-background-secondary rounded-lg overflow-hidden ${className}`}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-background-tertiary transition-colors"
        type="button"
        aria-expanded={isExpanded}
      >
        <span className="text-xs font-bold font-brice text-foreground-muted uppercase tracking-wide flex items-center gap-2">
          <InfoIcon className="w-4 h-4" />
          {title}
        </span>
        <ChevronIcon
          className={`w-4 h-4 text-foreground-muted transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 text-sm text-foreground-muted font-mundial leading-relaxed border-t border-border pt-3">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Inline info tooltip for metric definitions.
 * Hidden from export via export-hide class.
 */
export function ChartInfoTooltip({
  content,
  className = "",
}: {
  content: React.ReactNode;
  className?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span className={`export-hide relative inline-block ${className}`}>
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        className="w-4 h-4 rounded-full bg-background-tertiary text-foreground-muted hover:text-foreground hover:bg-background-secondary transition-colors flex items-center justify-center text-xs"
        type="button"
        aria-label="More info"
      >
        ?
      </button>

      {isVisible && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-background-secondary border border-border rounded-lg shadow-lg">
          <div className="text-xs text-foreground-muted font-mundial leading-relaxed">
            {content}
          </div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-border" />
        </div>
      )}
    </span>
  );
}

// Info icon
function InfoIcon({ className }: { className?: string }) {
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
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

// Chevron icon
function ChevronIcon({ className }: { className?: string }) {
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
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}
