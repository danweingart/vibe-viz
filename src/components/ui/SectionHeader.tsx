/**
 * Numbered section header — single shared implementation for all pages.
 * Sticky under the global ChartControls bar.
 */
export function SectionHeader({
  number,
  title,
  id,
}: {
  number: string;
  title: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className="flex items-center gap-3 mb-4 sticky top-[120px] z-30 py-2 -mx-1 px-1 bg-gvc-bg/80 backdrop-blur-md"
    >
      <span className="text-[11px] font-mono text-brand bg-brand/10 px-2 py-0.5 rounded-full border border-brand/20 uppercase tracking-wider">
        {number}
      </span>
      <h2 className="text-3xl font-brice text-gvc-text tracking-tight">{title}</h2>
      <div className="flex-1 h-px bg-gradient-to-r from-gvc-border via-gvc-border/50 to-transparent" />
    </div>
  );
}
