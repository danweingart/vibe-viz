"use client";

import { STATE_STYLE } from "@/lib/chartConfig";

interface ChartLoadingSkeletonProps {
  className?: string;
}

/**
 * Loading skeleton with shimmer animation
 * Uses responsive height optimized for desktop display
 */
export function ChartLoadingSkeleton({ className = "" }: ChartLoadingSkeletonProps) {
  return (
    <div
      className={`rounded-lg chart-skeleton min-h-[280px] sm:min-h-[360px] ${className}`}
      role="status"
      aria-label="Loading chart"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

interface ChartEmptyStateProps {
  message?: string;
  className?: string;
}

/**
 * Empty state - grayed skeleton with "No data" overlay
 * Uses responsive height optimized for desktop display
 */
export function ChartEmptyState({
  message = "No data available",
  className = "",
}: ChartEmptyStateProps) {
  return (
    <div
      className={`rounded-lg bg-background-secondary chart-skeleton-static flex flex-col items-center justify-center min-h-[280px] sm:min-h-[360px] ${className}`}
      role="status"
      aria-label={message}
    >
      <ChartIcon
        className="mb-4 opacity-40"
        style={{
          width: STATE_STYLE.empty.iconSize,
          height: STATE_STYLE.empty.iconSize,
          color: STATE_STYLE.empty.iconColor,
        }}
      />
      <p
        className="font-mundial"
        style={{
          fontSize: STATE_STYLE.empty.messageFontSize,
          color: STATE_STYLE.empty.messageColor,
        }}
      >
        {message}
      </p>
    </div>
  );
}

interface ChartErrorStateProps {
  message?: string;
  error?: Error | null;
  onRetry?: () => void;
  className?: string;
}

/**
 * Error state - icon + message + optional retry button
 * Uses responsive height optimized for desktop display
 */
export function ChartErrorState({
  message = "Failed to load data",
  error,
  onRetry,
  className = "",
}: ChartErrorStateProps) {
  return (
    <div
      className={`rounded-lg bg-background-secondary flex flex-col items-center justify-center min-h-[280px] sm:min-h-[360px] ${className}`}
      role="alert"
      aria-label={message}
    >
      <ErrorIcon
        className="mb-4"
        style={{
          width: STATE_STYLE.error.iconSize,
          height: STATE_STYLE.error.iconSize,
          color: STATE_STYLE.error.iconColor,
        }}
      />
      <p
        className="font-mundial"
        style={{
          fontSize: STATE_STYLE.error.messageFontSize,
          color: STATE_STYLE.error.messageColor,
        }}
      >
        {message}
      </p>
      {error?.message && (
        <p
          className="font-mundial mt-1 opacity-60"
          style={{
            fontSize: STATE_STYLE.error.messageFontSize - 2,
            color: STATE_STYLE.error.messageColor,
          }}
        >
          {error.message}
        </p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 rounded-lg border font-mundial text-sm transition-colors hover:bg-background-tertiary"
          style={{
            borderColor: STATE_STYLE.error.retryButtonColor,
            color: STATE_STYLE.error.retryButtonColor,
          }}
          type="button"
        >
          Try again
        </button>
      )}
    </div>
  );
}

// Chart icon for empty state
function ChartIcon({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
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

// Error icon
function ErrorIcon({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
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
