import { readFile } from "node:fs/promises";
import { createClient } from "@vercel/postgres";
import { config } from "dotenv";
import { validateRoyaltyImport } from "../src/lib/royalties/import";
import { monthStart, offsetMonth } from "../src/lib/royalties/history";

config({ path: ".env.local", quiet: true });

async function main() {
  const args = process.argv.slice(2);
  const filename = args.find(arg => !arg.startsWith("--"));
  if (!filename || args.some(arg => arg.startsWith("--") && arg !== "--apply")) {
    throw new Error("Usage: npm run royalties:import -- /path/to/month.json [--apply] (default: validation only)");
  }
  const data = validateRoyaltyImport(JSON.parse(await readFile(filename, "utf8")));
  const unpriced = data.payments.filter(payment => payment.ethUsd === null).length;
  console.log(`Validated ${data.month}: ${data.payments.length} payouts, ${unpriced} missing FX rates, coverage ${data.complete ? "attested complete" : "incomplete"}.`);
  if (!args.includes("--apply")) {
    console.log("Dry run only. --apply atomically REPLACES this month's receipt snapshot and coverage. Supply the full month-to-cutoff dataset, never a delta.");
    return;
  }
  if (!process.env.POSTGRES_URL) throw new Error("POSTGRES_URL is required for --apply");
  const client = createClient({ connectionString: process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL });
  await client.connect();
  try {
    await client.query("BEGIN");
    // Serialize authoritative month replacement, including cross-month corrections.
    await client.query("SELECT pg_advisory_xact_lock(92471003)");
    const previous = await client.query("SELECT covered_through FROM gvc_royalty_coverage WHERE month = $1::date", [`${data.month}-01`]);
    if (previous.rows[0] && new Date(previous.rows[0].covered_through).getTime() > Date.parse(data.coveredThrough)) {
      throw new Error("Refusing an older coverage cutoff. Re-export the full month through at least the existing cutoff.");
    }
    const start = monthStart(data.month);
    const end = monthStart(offsetMonth(data.month, 1));
    await client.query("DELETE FROM gvc_royalty_payments WHERE paid_at >= $1::timestamptz AND paid_at < $2::timestamptz", [start, end]);
    await client.query(`
      INSERT INTO gvc_royalty_payments (tx_hash, payment_id, recipient, paid_at, currency, amount_wei, eth_usd, fx_source, evidence, source)
      SELECT p->>'txHash', p->>'paymentId', p->>'recipient', (p->>'paidAt')::timestamptz,
        p->>'currency', (p->>'amountWei')::numeric, (p->>'ethUsd')::numeric,
        p->>'fxSource', p->>'evidence', $2
      FROM jsonb_array_elements($1::jsonb) p
    `, [JSON.stringify(data.payments), data.source]);
    await client.query(`
      INSERT INTO gvc_royalty_coverage (month, covered_through, complete, source, verified_by)
      VALUES ($1::date, $2::timestamptz, $3, $4, $5)
      ON CONFLICT (month) DO UPDATE SET covered_through = EXCLUDED.covered_through,
        complete = EXCLUDED.complete, source = EXCLUDED.source,
        verified_by = EXCLUDED.verified_by, updated_at = NOW()
    `, [`${data.month}-01`, data.coveredThrough, data.complete, data.source, data.verifiedBy]);
    await client.query("COMMIT");
    console.log(`Committed ${data.month}. The dashboard will pick up this snapshot on its next refresh (within five minutes).`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : "Royalty import failed");
  process.exitCode = 1;
});
