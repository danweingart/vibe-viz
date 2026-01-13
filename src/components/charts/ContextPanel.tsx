"use client";

import { CONTEXT_PANEL } from "@/lib/tokens";

export interface ContextPanelProps {
  /** Optional title for the panel */
  title?: string;
  /** Panel content */
  children: React.ReactNode;
  /** Optional className */
  className?: string;
}

/**
 * Standardized context/info panel component
 *
 * Used for displaying contextual information, helper text,
 * or additional metrics below the chart header.
 *
 * Features:
 * - Consistent styling with background tertiary
 * - 12px padding, 8px border radius
 * - Optional title with proper typography
 * - Uses GVC design tokens
 */
export function ContextPanel({
  title,
  children,
  className = "",
}: ContextPanelProps) {
  return (
    <div
      className={`font-mundial ${className}`}
      style={{
        padding: CONTEXT_PANEL.container.padding,
        borderRadius: CONTEXT_PANEL.container.borderRadius,
        background: CONTEXT_PANEL.container.background,
        border: CONTEXT_PANEL.container.border,
        marginBottom: CONTEXT_PANEL.container.marginBottom,
      }}
    >
      {title && (
        <div
          className="text-foreground-muted"
          style={{
            fontSize: CONTEXT_PANEL.title.fontSize,
            fontWeight: CONTEXT_PANEL.title.fontWeight,
            marginBottom: CONTEXT_PANEL.title.marginBottom,
          }}
        >
          {title}
        </div>
      )}

      <div
        className="text-foreground-muted"
        style={{
          fontSize: CONTEXT_PANEL.content.fontSize,
          fontWeight: CONTEXT_PANEL.content.fontWeight,
          lineHeight: CONTEXT_PANEL.content.lineHeight,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default ContextPanel;
