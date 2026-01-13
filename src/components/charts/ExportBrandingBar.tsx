"use client";

interface ExportBrandingBarProps {
  visible?: boolean;
}

export function ExportBrandingBar({ visible = false }: ExportBrandingBarProps) {
  if (!visible) return null;

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-background-tertiary border-b border-border">
      <span className="font-brice font-bold text-brand" style={{ fontSize: 16 }}>
        Good Vibes Club
      </span>
      <span className="text-foreground-muted" style={{ fontSize: 16 }}>
        goodvibesclub.io
      </span>
    </div>
  );
}
