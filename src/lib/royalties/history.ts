import type { RoyaltyAggregate, RoyaltyHistory, RoyaltyMonth } from "../../types/royalties";

export function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

export function offsetMonth(month: string, offset: number): string {
  const [year, index] = month.split("-").map(Number);
  return monthKey(new Date(Date.UTC(year, index - 1 + offset, 1)));
}

export function monthStart(month: string): string {
  return `${month}-01T00:00:00.000Z`;
}

// Include one extra completed month as the baseline for the first displayed MoM.
export function royaltyWindow(now = new Date()) {
  const current = monthKey(now);
  return { start: monthStart(offsetMonth(current, -13)), end: monthStart(offsetMonth(current, 1)) };
}

export function percentChange(value: number | null, previous: number | null): number | null {
  if (value === null || previous === null || previous === 0) return null;
  return ((value - previous) / previous) * 100;
}

export function buildRoyaltyHistory(rows: RoyaltyAggregate[], now = new Date()): RoyaltyHistory {
  const current = monthKey(now);
  const byMonth = new Map(rows.map(row => [row.month, row]));
  const all: RoyaltyMonth[] = [];
  for (let offset = -13; offset <= 0; offset++) {
    const month = offsetMonth(current, offset);
    const row = byMonth.get(month);
    const isCurrent = month === current;
    const through = row?.coveredThrough ? Date.parse(row.coveredThrough) : NaN;
    const nextStart = Date.parse(monthStart(offsetMonth(month, 1)));
    const start = Date.parse(monthStart(month));
    const complete = Boolean(row?.complete && Number.isFinite(through) &&
      (isCurrent ? through > start && through <= now.getTime() : through >= nextStart));
    const eth = complete ? Number(row!.eth) : null;
    // A missing FX rate is unknown, never zero or today's price.
    const usd = complete && row!.unpricedCount === 0 ? Number(row!.usd) : null;
    const previous = all.at(-1);
    all.push({
      month, eth, usd, paymentCount: row?.paymentCount ?? 0,
      status: complete ? "complete" : row ? "partial" : "missing",
      coveredThrough: row?.coveredThrough ?? null, isCurrent,
      changeEth: isCurrent ? null : percentChange(eth, previous?.eth ?? null),
      changeUsd: isCurrent ? null : percentChange(usd, previous?.usd ?? null),
    });
  }
  const months = all.slice(1);
  const completed = months.filter(month => !month.isCurrent);
  const completeMonths = completed.filter(month => month.status === "complete").length;
  const updates = rows.flatMap(row => row.updatedAt ? [row.updatedAt] : []).sort();
  return {
    status: completeMonths === 12 ? "ready" : "awaiting_backfill",
    months, completeMonths,
    totalEth: completed.every(month => month.eth !== null) ? completed.reduce((sum, month) => sum + month.eth!, 0) : null,
    totalUsd: completed.every(month => month.usd !== null) ? completed.reduce((sum, month) => sum + month.usd!, 0) : null,
    updatedAt: updates.at(-1) ?? null,
    asOf: now.toISOString(),
  };
}
