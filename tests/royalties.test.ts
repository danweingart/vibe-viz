import test from "node:test";
import assert from "node:assert/strict";
import { buildRoyaltyHistory, offsetMonth, percentChange, royaltyWindow } from "../src/lib/royalties/history";
import { validateRoyaltyImport } from "../src/lib/royalties/import";
import type { RoyaltyAggregate } from "../src/types/royalties";

const now = new Date("2026-10-26T12:00:00.000Z");
function row(month: string, eth = "1", usd = "2500"): RoyaltyAggregate {
  return { month, eth, usd, paymentCount: 1, unpricedCount: 0, complete: true,
    coveredThrough: `${offsetMonth(month, 1)}-01T00:00:00.000Z`, updatedAt: now.toISOString() };
}
const fixture = () => ({ month: "2026-09", coveredThrough: "2026-10-01T00:00:00.000Z", complete: true,
  source: "Reconciled marketplace receipt export", verifiedBy: "test-reviewer",
  payments: [{ txHash: `0x${"a".repeat(64)}`, paymentId: "log:42", recipient: `0x${"b".repeat(40)}`,
    paidAt: "2026-09-12T12:34:56.000Z", currency: "WETH", amountWei: "100000000000000001",
    ethUsd: "2512.12345678", fxSource: "Historical daily ETH/USD, 2026-09-12", evidence: "Receipt log 42 attributable to GVC secondary sale" }] });

test("UTC window includes 12 completed months, MTD and a hidden comparison baseline", () => {
  assert.deepEqual(royaltyWindow(now), { start: "2025-09-01T00:00:00.000Z", end: "2026-11-01T00:00:00.000Z" });
  const result = buildRoyaltyHistory([], now);
  assert.equal(result.months.length, 13);
  assert.equal(result.months[0].month, "2025-10");
  assert.equal(result.months.at(-1)!.isCurrent, true);
  assert.equal(offsetMonth("2024-01", -1), "2023-12");
});
test("missing months stay null; a verified zero month is zero", () => {
  const zero = { ...row("2026-09", "0", "0"), paymentCount: 0 };
  const result = buildRoyaltyHistory([zero], now);
  assert.equal(result.months[0].eth, null);
  assert.equal(result.months[11].eth, 0);
  assert.equal(result.totalEth, null);
  assert.equal(result.completeMonths, 1);
});
test("annual totals exclude MTD and baseline; historical USD is summed independently", () => {
  const rows = Array.from({ length: 14 }, (_, i) => row(offsetMonth("2026-10", i - 13), "2", String(1000 + i * 100)));
  rows[13].coveredThrough = now.toISOString();
  const result = buildRoyaltyHistory(rows, now);
  assert.equal(result.totalEth, 24);
  assert.equal(result.totalUsd, 19800);
  assert.equal(result.status, "ready");
  assert.equal(result.months[0].changeEth, 0);
  assert.equal(result.months.at(-1)!.changeEth, null);
});
test("MoM uses adjacent verified months and handles zero baselines", () => {
  const result = buildRoyaltyHistory([row("2026-07", "2"), row("2026-09", "4")], now);
  assert.equal(result.months[11].changeEth, null);
  assert.equal(percentChange(0, 10), -100);
  assert.equal(percentChange(10, 0), null);
  assert.equal(percentChange(0, 0), null);
  assert.equal(percentChange(12, 8), 50);
});
test("partial coverage cannot produce misleading complete-month amounts", () => {
  const result = buildRoyaltyHistory([{ ...row("2026-09"), coveredThrough: "2026-09-15T00:00:00.000Z" }], now);
  assert.equal(result.months[11].status, "partial");
  assert.equal(result.months[11].eth, null);
});
test("missing FX suppresses USD but keeps verified ETH", () => {
  const result = buildRoyaltyHistory([{ ...row("2026-09"), unpricedCount: 1 }], now);
  assert.equal(result.months[11].eth, 1);
  assert.equal(result.months[11].usd, null);
});
test("validator preserves integer precision and rejects duplicate sweep payouts", () => {
  assert.equal(validateRoyaltyImport(fixture(), now).payments[0].amountWei, "100000000000000001");
  const data = fixture(); data.payments.push({ ...data.payments[0] });
  assert.throws(() => validateRoyaltyImport(data, now), /Duplicate payout/);
});
test("validator enforces month boundaries, coverage, and explicit attestation", () => {
  const data = fixture();
  data.payments[0].paidAt = "2026-10-01T00:00:00.000Z";
  assert.throws(() => validateRoyaltyImport(data, now), /outside/);
  assert.throws(() => validateRoyaltyImport({ ...fixture(), complete: undefined }, now), /explicitly attest/);
  assert.throws(() => validateRoyaltyImport({ ...fixture(), coveredThrough: "2026-09-15T00:00:00.000Z" }, now), /historical month/);
  assert.throws(() => validateRoyaltyImport({ ...fixture(), coveredThrough: "2027-01-01T00:00:00.000Z" }, now), /future/);
});
test("validator rejects wrong units, unsupported currencies, invalid dates, and missing FX provenance", () => {
  for (const update of [{ amountWei: "0.1" }, { amountWei: "-1" }, { amountWei: 100 }, { currency: "USDC" },
    { paidAt: "2026-09-31T00:00:00.000Z" }, { ethUsd: "2500", fxSource: null }, { paymentId: "nft:123" }]) {
    const data = fixture(); Object.assign(data.payments[0], update);
    assert.throws(() => validateRoyaltyImport(data, now));
  }
});
test("verified empty months and unpriced receipts can be imported explicitly", () => {
  assert.equal(validateRoyaltyImport({ ...fixture(), payments: [] }, now).payments.length, 0);
  const data = fixture();
  Object.assign(data.payments[0], { ethUsd: null, fxSource: null });
  assert.equal(validateRoyaltyImport(data, now).payments[0].ethUsd, null);
});
