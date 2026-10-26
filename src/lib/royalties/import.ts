import { monthStart, offsetMonth } from "./history";

export interface RoyaltyImport {
  month: string;
  coveredThrough: string;
  complete: boolean;
  source: string;
  verifiedBy: string;
  payments: {
    txHash: string;
    paymentId: string;
    recipient: string;
    paidAt: string;
    currency: "ETH" | "WETH";
    amountWei: string;
    ethUsd: string | null;
    fxSource: string | null;
    evidence: string;
  }[];
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string`);
  return value.trim();
}

function timestamp(value: unknown, label: string): string {
  const result = text(value, label);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(result) ||
    !Number.isFinite(Date.parse(result)) || new Date(result).toISOString() !== result) {
    throw new Error(`${label} must be a valid UTC ISO timestamp, e.g. 2026-09-01T00:00:00.000Z`);
  }
  return result;
}

export function validateRoyaltyImport(input: unknown, now = new Date()): RoyaltyImport {
  const raw = record(input, "Import");
  const month = text(raw.month, "month");
  if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("month must be YYYY-MM (2000–2099)");
  const start = monthStart(month);
  const end = monthStart(offsetMonth(month, 1));
  const coveredThrough = timestamp(raw.coveredThrough, "coveredThrough");
  if (coveredThrough <= start || coveredThrough > end || Date.parse(coveredThrough) > now.getTime()) {
    throw new Error("coveredThrough must be inside the month (or its exclusive end) and cannot be in the future");
  }
  if (typeof raw.complete !== "boolean") throw new Error("complete must explicitly attest true or false");
  if (raw.complete && end <= now.toISOString() && coveredThrough !== end) {
    throw new Error("A complete historical month must cover through the next UTC month boundary");
  }
  const source = text(raw.source, "source");
  const verifiedBy = text(raw.verifiedBy, "verifiedBy");
  if (!Array.isArray(raw.payments)) throw new Error("payments must be an array (empty only for verified zero receipts or incomplete data)");
  const seen = new Set<string>();
  const payments = raw.payments.map((value, index): RoyaltyImport["payments"][number] => {
    const row = record(value, `payments[${index}]`);
    const txHash = text(row.txHash, "txHash").toLowerCase();
    const recipient = text(row.recipient, "recipient").toLowerCase();
    if (!/^0x[0-9a-f]{64}$/.test(txHash)) throw new Error(`Invalid txHash at payment ${index}`);
    if (!/^0x[0-9a-f]{40}$/.test(recipient) || /^0x0{40}$/.test(recipient)) throw new Error(`Invalid recipient at payment ${index}`);
    const paymentId = text(row.paymentId, "paymentId");
    if (!/^(log:\d+|trace:\d+(?:_\d+)*)$/.test(paymentId) || paymentId.length > 200) {
      throw new Error("paymentId must identify an actual payout: log:<index> or trace:<trace_address>");
    }
    const key = `${txHash}:${paymentId}`;
    if (seen.has(key)) throw new Error(`Duplicate payout ${key}; do not repeat a sweep payment per NFT`);
    seen.add(key);
    const paidAt = timestamp(row.paidAt, "paidAt");
    if (paidAt < start || paidAt >= coveredThrough) throw new Error(`Payment ${index} is outside the covered UTC interval`);
    if (row.currency !== "ETH" && row.currency !== "WETH") throw new Error("Only ETH/WETH receipts are supported; extend valuation before importing other currencies");
    const amountWei = text(row.amountWei, "amountWei");
    if (!/^[1-9]\d{0,77}$/.test(amountWei)) throw new Error("amountWei must be a positive integer string of at most 78 digits");
    let ethUsd: string | null = null;
    let fxSource: string | null = null;
    if (row.ethUsd != null) {
      ethUsd = text(row.ethUsd, "ethUsd");
      if (!/^\d{1,16}(\.\d{1,8})?$/.test(ethUsd) || Number(ethUsd) <= 0) throw new Error("ethUsd must be a positive decimal string (up to 8 decimals)");
      fxSource = text(row.fxSource, "fxSource");
    } else if (row.fxSource != null) throw new Error("fxSource must be null when ethUsd is null");
    const evidence = text(row.evidence, "evidence");
    return { txHash, paymentId, recipient, paidAt, currency: row.currency, amountWei, ethUsd, fxSource, evidence };
  });
  return { month, coveredThrough, complete: raw.complete, source, verifiedBy, payments };
}
