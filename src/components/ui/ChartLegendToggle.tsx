"use client";

interface LegendItem {
  key: string;
  label: string;
  color: string;
  active?: boolean;
}

interface ChartLegendToggleProps {
  items: LegendItem[];
  onToggle?: (key: string) => void;
}

export function ChartLegendToggle({ items, onToggle }: ChartLegendToggleProps) {
  return (
    <div className="flex items-center gap-2">
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onToggle?.(item.key)}
          className={`
            flex items-center gap-1.5 px-2.5 py-1 rounded-full
            border border-border bg-background-secondary
            text-[10px] font-medium transition-all
            ${item.active !== false ? "text-foreground" : "text-foreground-muted opacity-50"}
            ${onToggle ? "hover:bg-background-tertiary cursor-pointer" : "cursor-default"}
          `}
        >
          <div
            className="w-1 h-4 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
