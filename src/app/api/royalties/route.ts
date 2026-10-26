import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { buildRoyaltyHistory, royaltyWindow } from "@/lib/royalties/history";
import type { RoyaltyAggregate } from "@/types/royalties";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  const headers = { "Cache-Control": "no-store" };
  const setup = () => NextResponse.json({ ...buildRoyaltyHistory([], now), status: "setup_required" }, { headers });
  if (!process.env.POSTGRES_URL) return setup();

  try {
    const { start, end } = royaltyWindow(now);
    // Exact NUMERIC arithmetic stays in Postgres until presentation. A single
    // statement reads payments + coverage consistently during atomic imports.
    const result = await sql`
      WITH payments AS (
        SELECT date_trunc('month', paid_at AT TIME ZONE 'UTC')::date AS month,
          SUM(amount_wei / 1000000000000000000::numeric)::text AS eth,
          COALESCE(SUM(amount_wei / 1000000000000000000::numeric * eth_usd), 0)::text AS usd,
          COUNT(*)::int AS payment_count,
          COUNT(*) FILTER (WHERE eth_usd IS NULL)::int AS unpriced_count
        FROM gvc_royalty_payments
        WHERE paid_at >= ${start}::timestamptz AND paid_at < ${end}::timestamptz
        GROUP BY 1
      )
      SELECT to_char(COALESCE(c.month, p.month), 'YYYY-MM') AS month,
        COALESCE(p.eth, '0') AS eth, COALESCE(p.usd, '0') AS usd,
        COALESCE(p.payment_count, 0) AS "paymentCount",
        COALESCE(p.unpriced_count, 0) AS "unpricedCount",
        COALESCE(c.complete, false) AS complete,
        c.covered_through AS "coveredThrough", c.updated_at AS "updatedAt"
      FROM gvc_royalty_coverage c FULL OUTER JOIN payments p ON c.month = p.month
      WHERE COALESCE(c.month, p.month) >= (${start}::timestamptz AT TIME ZONE 'UTC')::date
        AND COALESCE(c.month, p.month) < (${end}::timestamptz AT TIME ZONE 'UTC')::date
      ORDER BY 1
    `;
    const rows = result.rows.map(row => ({ ...row,
      coveredThrough: row.coveredThrough ? new Date(row.coveredThrough).toISOString() : null,
      updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
    })) as RoyaltyAggregate[];
    return NextResponse.json(buildRoyaltyHistory(rows, now), { headers });
  } catch (error) {
    if ((error as { code?: string }).code === "42P01") return setup();
    console.error("Royalty history query failed", error instanceof Error ? error.message : "Unknown database error");
    return NextResponse.json({ error: "Royalty history is temporarily unavailable. Please retry." }, { status: 503, headers });
  }
}
