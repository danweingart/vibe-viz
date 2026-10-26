import test from "node:test";
import assert from "node:assert/strict";
import { etherscanResult, historicalRate, receipts, scan, WETH } from "../scripts/sync-gvc-royalties";
import { validateRoyaltyImport } from "../src/lib/royalties/import";

const wallet = `0x${"b".repeat(40)}`;
const sender = `0x${"c".repeat(40)}`;
const hash = `0x${"a".repeat(64)}`;
const start = "2026-09-01T00:00:00.000Z";
const end = "2026-10-01T00:00:00.000Z";
const seconds = Date.parse(start) / 1000 + 100;
const transfer = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const row = (extra = {}) => ({ hash, from: sender, to: wallet, value: "100000000000000001",
  timeStamp: String(seconds), isError: "0", traceId: "0", transactionHash: hash,
  logIndex: "0x2a", data: "0x16345785d8a0001", ...extra });
const log = (extra = {}) => row({ address: WETH, timeStamp: `0x${seconds.toString(16)}`,
  topics: [transfer, `0x${sender.slice(2).padStart(64, "0")}`, `0x${wallet.slice(2).padStart(64, "0")}`], ...extra });

test("collects exact ETH, internal ETH and WETH once with canonical identities", () => {
  const payments = receipts(wallet, [row()], [row(), row({ traceId: "0_1" })], [log(), log()], start, end);
  assert.deepEqual(payments.map(p => p.paymentId).sort(), ["internal:0", "log:42", "normal:0"]);
  assert.ok(payments.every(p => p.amountWei === "100000000000000001"));
  assert.equal(payments.find(p => p.paymentId === "log:42")!.currency, "WETH");
  assert.equal(validateRoyaltyImport({ month: "2026-09", coveredThrough: end, complete: true,
    source: "test", verifiedBy: "test", payments }, new Date(end)).payments.length, 3);
});

test("excludes failed, outgoing, self transfers, zero amounts, unwraps and out-of-window payments", () => {
  const excluded = [row({ isError: "1" }), row({ txreceipt_status: "0" }), row({ to: sender }),
    row({ from: wallet }), row({ value: "0" }), row({ from: WETH }), row({ timeStamp: String(Date.parse(end) / 1000) }),
    row({ timeStamp: String(Date.parse(start) / 1000 - 1) })];
  const self = log({ topics: [transfer, `0x${wallet.slice(2).padStart(64, "0")}`, `0x${wallet.slice(2).padStart(64, "0")}`] });
  assert.deepEqual(receipts(wallet, excluded, excluded, [self], start, end), []);
  assert.throws(() => receipts(wallet, [], [], [log({ address: sender })], start, end), /Unexpected WETH/);
  assert.throws(() => receipts(wallet, [row(), row({ value: "2" })], [], [], start, end), /Conflicting receipt/);
});

test("full result pages split block ranges; saturated single blocks fail closed", async () => {
  const ranges: string[] = [];
  const result = await scan(async params => {
    ranges.push(`${params.startblock}-${params.endblock}`);
    return params.startblock === "10" && params.endblock === "13" ? Array(1000).fill(row()) : [row()];
  }, { module: "account" }, 10, 13);
  assert.equal(result.length, 2);
  assert.deepEqual(ranges, ["10-13", "10-11", "12-13"]);
  await assert.rejects(scan(async () => Array(1000).fill(row()), { module: "logs" }, 10, 10), /single block/);
  await assert.rejects(scan(async () => "NOTOK", { module: "account" }, 10, 13), /Unexpected/);
});

test("provider failure cannot masquerade as a verified zero month", () => {
  assert.deepEqual(etherscanResult({ status: "0", message: "No transactions found", result: [] }), []);
  assert.throws(() => etherscanResult({ status: "0", message: "NOTOK", result: "Max rate limit reached" }), /failed/);
  assert.throws(() => etherscanResult({ status: "0", message: "No records found", result: "error" }), /failed/);
});

test("historical FX keeps source timestamp and rejects missing or distant quotes", () => {
  const body = { coins: { "coingecko:ethereum": { price: 2512.12345, timestamp: seconds } } };
  assert.equal(historicalRate(body, seconds).ethUsd, "2512.12345000");
  assert.match(historicalRate(body, seconds).fxSource, /2026-09-01T00:01:40.000Z/);
  assert.throws(() => historicalRate(body, seconds + 3601), /Missing historical/);
  assert.throws(() => historicalRate({}, seconds), /Missing historical/);
});

 test("batch-sale internal transfers with reused trace IDs are all included", () => {
  const payments = receipts(wallet, [], [row({ value: "10" }), row({ value: "20" }), row({ value: "20" })], [], start, end);
  assert.equal(payments.length, 1);
  assert.equal(payments[0].paymentId, "internal:0");
  assert.equal(payments[0].amountWei, "50");
});
