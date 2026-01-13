"use client";

import { FONT_SIZE, SPACING } from "@/lib/tokens";

interface ToggleOption<T extends string> {
  value: T;
  label: string;
}

interface ToggleButtonGroupProps<T extends string> {
  options: ToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  activeColor?: string;
  size?: "sm" | "md";
}

/**
 * Unified toggle button group for chart view controls.
 * Uses design tokens for consistent sizing across all charts.
 *
 * @example
 * <ToggleButtonGroup
 *   options={[
 *     { value: "sales", label: "Sales" },
 *     { value: "volume", label: "Volume" },
 *   ]}
 *   value={viewMode}
 *   onChange={setViewMode}
 * />
 */
export function ToggleButtonGroup<T extends string>({
  options,
  value,
  onChange,
  activeColor = "bg-brand",
  size = "sm",
}: ToggleButtonGroupProps<T>) {
  const sizeStyles = {
    sm: {
      paddingX: SPACING.legendPillPaddingX,
      paddingY: SPACING.legendPillPaddingY,
      fontSize: FONT_SIZE.xs,
    },
    md: {
      paddingX: SPACING.legendPillPaddingX + 4,
      paddingY: SPACING.legendPillPaddingY + 2,
      fontSize: FONT_SIZE.sm,
    },
  };

  const styles = sizeStyles[size];

  return (
    <div
      className="flex rounded-lg border border-border overflow-hidden"
      role="group"
      aria-label="View toggle"
    >
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            aria-pressed={isActive}
            type="button"
            style={{
              paddingLeft: styles.paddingX,
              paddingRight: styles.paddingX,
              paddingTop: styles.paddingY,
              paddingBottom: styles.paddingY,
              fontSize: styles.fontSize,
            }}
            className={`font-medium transition-colors ${
              isActive
                ? `${activeColor} text-background`
                : "text-foreground-muted hover:text-foreground hover:bg-border"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
