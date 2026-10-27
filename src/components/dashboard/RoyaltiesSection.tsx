"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { StandardChartCard } from "@/components/charts/StandardChartCard";
import { Card, SectionHeader, StatCard, ToggleButtonGroup } from "@/components/ui";
import { useRoyaltyHistory } from "@/hooks/useRoyaltyHistory";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { AXIS_STYLE, GRID_STYLE, getTooltipContentStyle } from "@/lib/chartConfig";
import { CHART_COLORS } from "@/lib/constants";
import type { RoyaltyHistory } from "@/types/royalties";

export function royaltyAmount(value: number | null | undefined, currency: "eth" | "usd") {
  if (value == null) return "—";
  return currency === "eth"
    ? `${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ETH`
    : value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

function monthLabel(month: string) {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
}

function changeLabel(value: number | null | undefined) {
  return value == null ? "—" : `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function RoyaltiesSection() {
  const query = useRoyaltyHistory();
  return <RoyaltiesView data={query.data} isLoading={query.isLoading} error={query.error} onRetry={() => void query.refetch()} />;
}

export function RoyaltiesView({ data, isLoading = false, error = null, onRetry, sample = false }: {
  data?: RoyaltyHistory;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  sample?: boolean;
}) {
  const { currency, setCurrency } = useChartSettings();
  const months = data?.months.filter(month => !month.isCurrent) ?? [];
  const current = data?.months.find(month => month.isCurrent);
  const latest = months.at(-1);
  const total = currency === "eth" ? data?.totalEth : data?.totalUsd;
  const otherCurrency = currency === "eth" ? "usd" : "eth";
  const otherTotal = currency === "eth" ? data?.totalUsd : data?.totalEth;
  const change = currency === "eth" ? latest?.changeEth : latest?.changeUsd;
  const hasChartData = months.some(month => month[currency] !== null);
  const missingFx = months.some(month => month.eth !== null && month.usd === null);
  const dateRange = months.length ? `${monthLabel(months[0].month)} – ${monthLabel(months.at(-1)!.month)}` : "Last 12 completed months";
  const currentThrough = current?.coveredThrough
    ? new Date(current.coveredThrough).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC"
    : null;
  const chartData = months.map(month => ({ ...month, amount: month[currency] }));

  return (
    <section className="mb-8" aria-label="GVC secondary-sale royalties">
      <SectionHeader number="01" title="Royalties" id="section-royalties" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <p className="text-foreground-muted text-sm">GVC secondary-sale royalties received · {dateRange}</p>
          <p className="text-foreground-muted text-xs mt-1">ETH includes WETH. USD uses each payment date’s historical exchange rate.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-foreground-muted">Display currency</span>
          <ToggleButtonGroup options={[{ value: "eth", label: "ETH" }, { value: "usd", label: "USD" }]} value={currency} onChange={setCurrency} />
        </div>
      </div>

      {sample && <div role="note" className="mb-4 rounded-lg border border-brand/30 bg-brand/10 px-4 py-3 text-sm text-brand">Sample data preview — illustrative amounts, not actual GVC royalties.</div>}
      {!error && !isLoading && data?.status !== "ready" && (
        <div role="status" className="mb-4 rounded-lg border border-border-light bg-background-tertiary px-4 py-3 text-sm text-foreground-muted">
          <strong className="text-foreground">Historical backfill pending.</strong>{" "}
          {data?.completeMonths ?? 0} of 12 completed months verified. Unverified months and annual totals remain blank; a verified month with no receipts shows zero.
        </div>
      )}
      {missingFx && <p role="status" className="text-sm text-foreground-muted mb-4">Some historical USD rates are missing. ETH remains available; affected USD totals are blank.</p>}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5" aria-live="polite">
        <StatCard label="12-month royalties" value={royaltyAmount(total, currency)} subValue={total == null ? "Awaiting complete coverage" : `${royaltyAmount(otherTotal, otherCurrency)} · completed months`} />
        <StatCard label="Last completed month" value={royaltyAmount(latest?.[currency], currency)} subValue={latest ? monthLabel(latest.month) : "—"} />
        <StatCard label={`Month-over-month · ${currency.toUpperCase()}`} value={changeLabel(change)} subValue={change == null ? "Needs two verified months & nonzero baseline" : "Last two completed months"} />
        <StatCard label="This month to date" value={royaltyAmount(current?.[currency], currency)} subValue={currentThrough ? `Through ${currentThrough}` : "Awaiting current-month sync"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StandardChartCard
          title={sample ? "Monthly royalties · SAMPLE" : "Monthly royalties"}
          description={`${currency.toUpperCase()} received · ${dateRange}`}
          isLoading={isLoading} error={error} onRetry={onRetry}
          isEmpty={!hasChartData}
          emptyMessage={currency === "usd" && missingFx ? "Historical USD rates pending" : "Verified royalty history will appear here"}
          exportConfig={hasChartData ? { title: sample ? "Sample royalty data — not actual GVC receipts" : "GVC secondary-sale royalties", filename: `gvc-royalties-${currency}${sample ? "-SAMPLE" : ""}` } : undefined}
          legend={[{ key: "royalties", label: sample ? `Sample royalties (${currency.toUpperCase()})` : `Received (${currency.toUpperCase()})`, color: CHART_COLORS.primary }]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 16, left: 0, bottom: 12 }} accessibilityLayer>
              <CartesianGrid stroke={GRID_STYLE.stroke} strokeDasharray={GRID_STYLE.strokeDasharray} vertical={false} />
              <XAxis dataKey="month" {...AXIS_STYLE} tickFormatter={monthLabel} minTickGap={18} />
              <YAxis {...AXIS_STYLE} width={65} tickFormatter={value => currency === "eth" ? String(value) : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(value)} />
              <Tooltip
                contentStyle={getTooltipContentStyle()}
                labelStyle={{ color: "var(--foreground)" }} itemStyle={{ color: "var(--foreground)" }}
                cursor={{ fill: "var(--background-elevated)" }}
                labelFormatter={label => monthLabel(String(label))}
                formatter={value => [royaltyAmount(value == null ? null : Number(value), currency), sample ? "Sample royalties" : "Royalties received"]}
              />
              <Bar dataKey="amount" fill={CHART_COLORS.primary} radius={[5, 5, 0, 0]} maxBarSize={36} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </StandardChartCard>

        <Card className="h-[380px] sm:h-[480px] !p-0 !transform-none overflow-hidden">
          <div className="p-3 border-b border-border">
            <h3 className="font-brice text-foreground">Monthly breakdown{sample ? " · SAMPLE" : ""}</h3>
            <p className="text-xs text-foreground-muted mt-1">Both currencies · MoM in {currency.toUpperCase()} · UTC calendar months</p>
          </div>
          <div className="overflow-auto flex-1 min-h-0" tabIndex={0} aria-label="Monthly royalty amounts">
            {isLoading ? <p className="p-6 text-foreground-muted" role="status">Loading royalty history…</p> : error ? <div className="p-6 text-foreground-muted"><p role="alert">Royalty history is temporarily unavailable.</p><button onClick={onRetry} className="mt-3 text-brand rounded-full border border-brand/30 px-4 py-1">Retry</button></div> : (
              <table className="w-full text-xs tabular-nums">
                <caption className="sr-only">GVC royalty receipts by month in ETH and historical USD. Dash means unknown, incomplete, or undefined comparison.</caption>
                <thead className="sticky top-0 bg-background-tertiary text-foreground-muted z-10">
                  <tr>{["Month", "ETH", "USD", "MoM"].map(label => <th key={label} scope="col" className={`p-3 font-medium ${label === "Month" ? "text-left" : "text-right"}`}>{label}</th>)}</tr>
                </thead>
                <tbody>{[...months].reverse().map(month => {
                  const delta = currency === "eth" ? month.changeEth : month.changeUsd;
                  return <tr key={month.month} className="border-t border-border hover:bg-background-tertiary">
                    <th scope="row" className="p-3 text-left font-normal whitespace-nowrap"><span className="text-foreground">{monthLabel(month.month)}</span>{month.status !== "complete" && <span className="block text-[10px] text-foreground-muted">{month.status === "partial" ? "Incomplete" : "Pending"}</span>}</th>
                    <td className="p-3 text-right whitespace-nowrap text-foreground">{royaltyAmount(month.eth, "eth").replace(" ETH", "")}</td>
                    <td className="p-3 text-right whitespace-nowrap text-foreground">{royaltyAmount(month.usd, "usd")}</td>
                    <td className={`p-3 text-right whitespace-nowrap ${delta == null || delta === 0 ? "text-muted" : delta > 0 ? "text-success" : "text-danger"}`}>{changeLabel(delta)}</td>
                  </tr>;
                })}</tbody>
              </table>
            )}
          </div>
          <p className="p-3 border-t border-border text-[11px] text-foreground-muted">Month-to-date is shown separately and excluded from annual totals and MoM.</p>
        </Card>
      </div>
      <p className="text-xs text-foreground-muted mt-3 leading-relaxed">
        Actual secondary-sale royalty payments only; excludes mint revenue, trading volume, and VIBESTR fees. Missing months are never treated as zero.
        {data?.updatedAt && ` Last import: ${new Date(data.updatedAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC.`}
      </p>
    </section>
  );
}
