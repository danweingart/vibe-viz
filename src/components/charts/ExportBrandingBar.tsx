"use client";

interface ExportBrandingBarProps {
  visible?: boolean;
}

export function ExportBrandingBar({ visible = false }: ExportBrandingBarProps) {
  if (!visible) return null;

  return (
    <div className="flex items-center justify-center px-3 py-2">
      <span className="font-brice font-bold text-brand" style={{ fontSize: 20 }}>
        Good Vibes Club
      </span>
    </div>
  );
}
