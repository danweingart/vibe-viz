/**
 * Page-level stat tile — single shared implementation.
 * Matches the dashboard StatsOverview surface (gvc card, 16px radius).
 */
export function StatCard({
  label,
  value,
  subValue,
}: {
  label: string;
  value: string | number;
  subValue?: string;
}) {
  return (
    <div className="rounded-2xl border border-gvc-border bg-gvc-card backdrop-blur-md p-4">
      <p className="text-xs text-gvc-text-muted uppercase tracking-wide mb-1">{label}</p>
      <p className="text-xl font-bold text-gvc-text font-brice">{value}</p>
      {subValue && <p className="text-xs text-gvc-text-muted">{subValue}</p>}
    </div>
  );
}
