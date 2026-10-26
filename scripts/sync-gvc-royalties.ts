import { mkdir, readFile, writeFile } from "node:fs/promises";
import { setTimeout as pause } from "node:timers/promises";
import { config } from "dotenv";
import { monthKey, monthStart, offsetMonth } from "../src/lib/royalties/history";
import { type RoyaltyImport, validateRoyaltyImport } from "../src/lib/royalties/import";
import { applyRoyaltyImport } from "./import-gvc-royalties";

export const WETH = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
type Row = {
  hash: string; from: string; to: string; value: string; timeStamp: string;
  isError: string; txreceipt_status?: string; traceId?: string;
  address?: string; topics?: string[]; transactionHash: string; logIndex: string; data: string;
};
type Payment = RoyaltyImport["payments"][number];
type Request = (params: Record<string, string>) => Promise<unknown>;

// Fail closed on provider errors. A rate limit or invalid key is not an empty month.
export function etherscanResult(body: { status?: string; message?: string; result?: unknown }): unknown {
  if (body.status === "1") return body.result;
  if (body.status === "0" && /^No (transactions|records|logs) found$/i.test(body.message ?? "") &&
      Array.isArray(body.result) && body.result.length === 0) return [];
  throw new Error("Etherscan request failed (check API key, plan limits, or retry later); no coverage advanced.");
}

// Split saturated block ranges instead of trusting a capped first page.
export async function scan(request: Request, params: Record<string, string>, from: number, to: number): Promise<Row[]> {
  const range: Record<string, string> = params.module === "logs" ? { fromBlock: String(from), toBlock: String(to) } : { startblock: String(from), endblock: String(to) };
  const rows = await request({ ...params, ...range, page: "1", offset: "1000", sort: "asc" });
  if (!Array.isArray(rows)) throw new Error("Unexpected Etherscan row response");
  if (rows.length < 1000) return rows;
  if (from === to) throw new Error("A single block reached the provider limit; refusing incomplete coverage.");
  const mid = Math.floor((from + to) / 2);
  return [...await scan(request, params, from, mid), ...await scan(request, params, mid + 1, to)];
}

export function receipts(wallet: string, normal: Row[], internal: Row[], logs: Row[], start: string, cutoff: string): Payment[] {
  const payments = new Map<string, Payment>();
  const direct = new Set<string>();
  const add = (hash: string, id: string, seconds: number, amount: string, currency: "ETH" | "WETH") => {
    const paidAt = new Date(seconds * 1000).toISOString();
    if (paidAt < start || paidAt >= cutoff || BigInt(amount) === BigInt(0)) return;
    const payment: Payment = { txHash: hash.toLowerCase(), paymentId: id, recipient: wallet, paidAt,
      currency, amountWei: amount, ethUsd: null, fxSource: null,
      evidence: `https://etherscan.io/tx/${hash} ; ${id}; incoming ${currency} to configured wallet; royalty classification requires confirmation` };
    const key = `${payment.txHash}:${id}`;
    const previous = payments.get(key);
    if (previous && JSON.stringify(previous) !== JSON.stringify(payment)) throw new Error(`Conflicting receipt ${key}`);
    payments.set(key, payment);
  };
  const incoming = (row: Row) => row.to?.toLowerCase() === wallet && row.from?.toLowerCase() !== wallet &&
    row.from?.toLowerCase() !== WETH && row.isError === "0" && row.txreceipt_status !== "0" && BigInt(row.value) > BigInt(0);
  for (const row of normal) {
    if (!incoming(row)) continue;
    direct.add(`${row.hash.toLowerCase()}:${row.from.toLowerCase()}:${row.value}`);
    add(row.hash, "normal:0", Number(row.timeStamp), row.value, "ETH");
  }
  const internalTotals = new Map<string, { seconds: number; wei: bigint }>();
  for (const row of internal) {
    if (!incoming(row)) continue;
    // Some indexers repeat the top-level value transfer as a root trace.
    if (row.traceId === "0" && direct.has(`${row.hash.toLowerCase()}:${row.from.toLowerCase()}:${row.value}`)) continue;
    // Etherscan can repeat traceId across distinct calls in a batch sale.
    // Store one exact internal-ETH sum per transaction instead of collapsing calls.
    const key = row.hash.toLowerCase();
    const total = internalTotals.get(key) ?? { seconds: Number(row.timeStamp), wei: BigInt(0) };
    if (total.seconds !== Number(row.timeStamp)) throw new Error("Inconsistent transaction timestamps");
    total.wei += BigInt(row.value);
    internalTotals.set(key, total);
  }
  for (const [hash, total] of internalTotals) add(hash, "internal:0", total.seconds, total.wei.toString(), "ETH");
  for (const row of logs) {
    if (row.address?.toLowerCase() !== WETH || row.topics?.[0]?.toLowerCase() !== TRANSFER ||
        row.topics?.[2]?.toLowerCase() !== `0x${wallet.slice(2).padStart(64, "0")}`) throw new Error("Unexpected WETH transfer log");
    const sender = `0x${row.topics[1]?.slice(-40)}`.toLowerCase();
    if (sender === wallet || sender === `0x${"0".repeat(40)}`) continue;
    add(row.transactionHash, `log:${BigInt(row.logIndex === "0x" ? "0x0" : row.logIndex)}`,
      Number(row.timeStamp), BigInt(row.data).toString(), "WETH");
  }
  return [...payments.values()].sort((a, b) => a.paidAt.localeCompare(b.paidAt) || a.txHash.localeCompare(b.txHash) || a.paymentId.localeCompare(b.paymentId));
}

export function historicalRate(body: { coins?: Record<string, { price?: number; timestamp?: number }> }, timestamp: number) {
  const quote = body.coins?.["coingecko:ethereum"];
  if (!quote || !Number.isFinite(quote.price) || quote.price! <= 0 || !Number.isFinite(quote.timestamp) ||
      Math.abs(quote.timestamp! - timestamp) > 3600) throw new Error("Missing historical ETH/USD quote within one hour of receipt; sync stopped.");
  return { ethUsd: quote.price!.toFixed(8), fxSource: `DefiLlama coingecko:ethereum; nearest historical reference ${new Date(quote.timestamp! * 1000).toISOString()}` };
}

async function main() {
  config({ path: ".env.local", quiet: true });
  const args = process.argv.slice(2);
  if (args.some(arg => !["--backfill", "--apply"].includes(arg))) throw new Error("Usage: npm run royalties:sync -- [--backfill] [--apply]");
  const wallet = process.env.GVC_ROYALTY_WALLET?.toLowerCase() ?? "";
  if (!/^0x[0-9a-f]{40}$/.test(wallet) || wallet === `0x${"0".repeat(40)}`) throw new Error("Set GVC_ROYALTY_WALLET to the actual receipt wallet (Ethereum mainnet).");
  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) throw new Error("ETHERSCAN_API_KEY is required.");
  const confirmed = process.env.GVC_ROYALTY_WALLET_CONFIRMED === "true";
  if (args.includes("--apply") && !confirmed) throw new Error("Confirm the wallet receives only GVC secondary-sale royalties throughout the requested history; set GVC_ROYALTY_WALLET_CONFIRMED=true. Mixed-use wallets require the reviewed JSON importer.");
  const request: Request = async params => {
    await pause(550);
    const url = new URL("https://api.etherscan.io/v2/api");
    url.search = new URLSearchParams({ chainid: "1", apikey: apiKey, ...params }).toString();
    const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`Etherscan HTTP ${response.status}; retry sync later.`);
    return etherscanResult(await response.json());
  };
  const blockBefore = async (timestamp: number) => {
    const value = await request({ module: "block", action: "getblocknobytime", timestamp: String(timestamp), closest: "before" });
    if (typeof value !== "string" || !/^\d+$/.test(value)) throw new Error("Invalid block boundary");
    return Number(value);
  };
  const now = new Date();
  // Allow an hour for confirmations and indexer lag; this is not a finality proof.
  const cutoff = new Date(Math.floor((now.getTime() - 3_600_000) / 1000) * 1000).toISOString();
  const current = monthKey(now);
  const out = process.env.GVC_ROYALTY_EXPORT_DIR || ".royalties";
  await mkdir(out, { recursive: true });
  const exclusions: { txHash: string; paymentId: string; reason: string }[] = process.env.GVC_ROYALTY_EXCLUSIONS
    ? JSON.parse(await readFile(process.env.GVC_ROYALTY_EXCLUSIONS, "utf8")) : [];
  if (!Array.isArray(exclusions) || exclusions.some(row => !/^0x[0-9a-f]{64}$/.test(row.txHash) ||
      !/^(normal:0|internal:0|trace:\d+(?:_\d+)*|log:\d+)$/.test(row.paymentId) || typeof row.reason !== "string" || !row.reason.trim())) {
    throw new Error("Exclusions must be an array of {txHash, paymentId, reason} with valid receipt identities.");
  }
  const excluded = new Set(exclusions.map(row => `${row.txHash}:${row.paymentId}`));
  for (let offset = args.includes("--backfill") ? -13 : -1; offset <= 0; offset++) {
    const month = offsetMonth(current, offset);
    const start = monthStart(month);
    const end = monthStart(offsetMonth(month, 1));
    const through = end < cutoff ? end : cutoff;
    if (through <= start || (end <= now.toISOString() && through < end)) continue;
    console.log(`Scanning ${month} ETH and WETH through ${through}…`);
    const from = await blockBefore(Date.parse(start) / 1000);
    const to = await blockBefore(Date.parse(through) / 1000 - 1);
    const normal = await scan(request, { module: "account", action: "txlist", address: wallet }, from, to);
    const internal = await scan(request, { module: "account", action: "txlistinternal", address: wallet }, from, to);
    const logs = await scan(request, { module: "logs", action: "getLogs", address: WETH,
      topic0: TRANSFER, topic2: `0x${wallet.slice(2).padStart(64, "0")}`, topic0_2_opr: "and" }, from, to);
    const allPayments = receipts(wallet, normal, internal, logs, start, through);
    const payments = allPayments.filter(payment => !excluded.has(`${payment.txHash}:${payment.paymentId}`));
    const excludedPayments = allPayments.filter(payment => excluded.has(`${payment.txHash}:${payment.paymentId}`));
    // Fetch hourly reference quotes in bounded batches, rather than one request per payment.
    const prices: { timestamp: number; price: number }[] = [];
    if (payments.length) {
      const first = Math.floor(Date.parse(payments[0].paidAt) / 3_600_000) * 3600;
      const last = Math.ceil(Date.parse(payments.at(-1)!.paidAt) / 3_600_000) * 3600;
      for (let timestamp = first; timestamp <= last; timestamp += 500 * 3600) {
        await pause(550);
        const span = Math.min(500, Math.floor((last - timestamp) / 3600) + 1);
        const response = await fetch(`https://coins.llama.fi/chart/coingecko:ethereum?start=${timestamp}&span=${span}&period=1h`, { signal: AbortSignal.timeout(30_000) });
        if (!response.ok) throw new Error(`Historical price HTTP ${response.status}; retry sync later.`);
        const body = await response.json();
        const quotes = body.coins?.["coingecko:ethereum"]?.prices;
        if (!Array.isArray(quotes)) throw new Error("Missing historical ETH/USD series");
        prices.push(...quotes);
      }
    }
    for (const payment of payments) {
      const timestamp = Date.parse(payment.paidAt) / 1000;
      const nearest = prices.reduce<(typeof prices)[number] | undefined>((best, quote) =>
        !best || Math.abs(quote.timestamp - timestamp) < Math.abs(best.timestamp - timestamp) ? quote : best, undefined);
      Object.assign(payment, historicalRate({ coins: nearest ? { "coingecko:ethereum": nearest } : {} }, timestamp));
    }
    await writeFile(`${out}/${month}-excluded.json`, JSON.stringify(excludedPayments.map(payment => ({ ...payment,
      reason: exclusions.find(row => row.txHash === payment.txHash && row.paymentId === payment.paymentId)!.reason })), null, 2) + "\n", { mode: 0o600 });
    // Direct deposits include unsolicited dust observed on this wallet. They
    // require explicit review, even when the wallet is otherwise dedicated.
    const unreviewedDirect = payments.filter(payment => payment.paymentId === "normal:0").length;
    const data = validateRoyaltyImport({ month, coveredThrough: through, complete: confirmed && unreviewedDirect === 0,
      source: `Etherscan v2 ETH normal/internal + canonical WETH logs; wallet ${wallet}; blocks ${from}-${to}; ${excludedPayments.length} explicitly excluded receipts (see export)`,
      verifiedBy: confirmed ? "Operator-confirmed dedicated GVC royalty wallet; sync v1" : "Unverified wallet preview; do not publish totals",
      payments }, now);
    await writeFile(`${out}/${month}.json`, JSON.stringify(data, null, 2) + "\n", { mode: 0o600 });
    console.log(`${month}: ${payments.length} receipts exported (${confirmed ? "dedicated wallet confirmed" : "unverified"}).`);
    if (args.includes("--apply")) {
      if (unreviewedDirect) throw new Error(`${month}: ${unreviewedDirect} direct ETH deposits need review. Exclude unrelated receipts with GVC_ROYALTY_EXCLUSIONS, or use the reviewed JSON importer for legitimate direct royalties. Month not changed.`);
      await applyRoyaltyImport(data);
    }
  }
  if (!args.includes("--apply")) console.log(`Dry run: JSON exports in ${out}; Postgres unchanged. Review before --apply.`);
}

if (require.main === module) main().catch(error => {
  console.error(error instanceof Error ? error.message : "Royalty sync failed");
  process.exitCode = 1;
});
