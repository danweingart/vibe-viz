"use client";

interface ExportBrandingBarProps {
  visible?: boolean;
}

export function ExportBrandingBar({ visible = false }: ExportBrandingBarProps) {
  if (!visible) return null;

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-background-tertiary border-t border-border">
      <span className="font-brice font-bold text-brand text-xs">
        Good Vibes Club
      </span>
      <span className="text-foreground-muted text-xs">
        goodvibesclub.io
      </span>
    </div>
  );
}
