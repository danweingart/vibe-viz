"use client";

export interface LegendItem {
  key: string;
  label: string;
  color: string;
  active?: boolean;
  value?: string;
}

export interface StandardLegendProps {
  items: LegendItem[];
  onToggle?: (key: string) => void;
  interactive?: boolean; // Defaults to true if onToggle provided
  layout?: "horizontal" | "vertical";
  size?: "sm" | "md";
  className?: string;
}

export function StandardLegend({
  items,
  onToggle,
  interactive,
  layout = "horizontal",
  size = "sm",
  className = "",
}: StandardLegendProps) {
  const isInteractive = interactive ?? !!onToggle;

  const sizeClasses = {
    sm: {
      container: "gap-2",
      button: "px-2 py-1 text-xs",
      dot: "w-2.5 h-2.5",
    },
    md: {
      container: "gap-3",
      button: "px-3 py-1.5 text-sm",
      dot: "w-3 h-3",
    },
  };

  const sizes = sizeClasses[size];

  return (
    <div
      className={`flex ${layout === "vertical" ? "flex-col" : "flex-row flex-wrap"} items-start ${sizes.container} ${className}`}
    >
      {items.map((item) => {
        const isActive = item.active !== false;

        if (isInteractive) {
          return (
            <button
              key={item.key}
              onClick={() => onToggle?.(item.key)}
              className={`flex items-center gap-1.5 ${sizes.button} rounded-full border border-border transition-all
                ${isActive ? "bg-background-tertiary" : "opacity-50 text-foreground-muted"}
                hover:bg-background-tertiary cursor-pointer
              `}
              type="button"
            >
              <span
                className={`${sizes.dot} rounded-full flex-shrink-0`}
                style={{ backgroundColor: item.color }}
              />
              <span className="font-mundial">{item.label}</span>
              {item.value && (
                <span
                  className="font-mundial font-semibold ml-0.5"
                  style={{ color: isActive ? item.color : undefined }}
                >
                  {item.value}
                </span>
              )}
            </button>
          );
        }

        return (
          <div
            key={item.key}
            className={`flex items-center gap-1.5 ${sizes.button} rounded-full border border-border
              ${isActive ? "bg-background-tertiary" : "opacity-50 text-foreground-muted"}
            `}
          >
            <span
              className={`${sizes.dot} rounded-full flex-shrink-0`}
              style={{ backgroundColor: item.color }}
            />
            <span className="font-mundial">{item.label}</span>
            {item.value && (
              <span
                className="font-mundial font-semibold ml-0.5"
                style={{ color: isActive ? item.color : undefined }}
              >
                {item.value}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
