/**
 * Display Name Resolver
 *
 * Resolves Ethereum addresses to human-readable names.
 * Priority: Manual tag → OpenSea username → ENS name → null
 *
 * Also provides account tagging CRUD for persistent manual labels.
 */

import { sql } from "@vercel/postgres";
import { cache } from "@/lib/cache/postgres";
import { globalRateLimiter } from "@/lib/etherscan/rate-limiter";

const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY;

// Cache TTL: 7 days for auto-resolved names
const NAME_CACHE_TTL = 604800;

// ─── Account Tags (dedicated table — immune to cache clears) ─────────

let tagTableReady = false;

async function ensureTagTable(): Promise<void> {
  if (tagTableReady) return;
  tagTableReady = true;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS account_tags (
        address TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
  } catch (error) {
    console.error("Failed to create account_tags table:", error);
    tagTableReady = false;
  }
}

export async function getAccountTag(address: string): Promise<string | null> {
  await ensureTagTable();
  try {
    const result = await sql`
      SELECT name FROM account_tags WHERE address = ${address.toLowerCase()}
    `;
    return result.rows[0]?.name || null;
  } catch {
    return null;
  }
}

export async function setAccountTag(
  address: string,
  name: string
): Promise<void> {
  await ensureTagTable();
  await sql`
    INSERT INTO account_tags (address, name, updated_at)
    VALUES (${address.toLowerCase()}, ${name}, NOW())
    ON CONFLICT (address)
    DO UPDATE SET name = ${name}, updated_at = NOW()
  `;
}

export async function deleteAccountTag(address: string): Promise<void> {
  await ensureTagTable();
  await sql`
    DELETE FROM account_tags WHERE address = ${address.toLowerCase()}
  `;
}

export async function getAllAccountTags(): Promise<Record<string, string>> {
  await ensureTagTable();
  try {
    const result = await sql`SELECT address, name FROM account_tags`;
    const tags: Record<string, string> = {};
    for (const row of result.rows) {
      tags[row.address] = row.name;
    }
    return tags;
  } catch (error) {
    console.error("getAllAccountTags error:", error);
    return {};
  }
}

// ─── OpenSea Resolution ──────────────────────────────────────────────

async function resolveViaOpenSea(address: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.opensea.io/api/v2/accounts/${address}`,
      {
        headers: {
          Accept: "application/json",
          ...(OPENSEA_API_KEY && { "X-API-KEY": OPENSEA_API_KEY }),
        },
        signal: AbortSignal.timeout(3000),
      }
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.username || null;
  } catch {
    return null;
  }
}

// ─── ENS Resolution ─────────────────────────────────────────────────

async function resolveViaENS(address: string): Promise<string | null> {
  try {
    await globalRateLimiter.wait();

    const universalResolver = "0xc0497E381f536Be9ce14B0dD3817cBcAe57d2F62";
    const response = await fetch("https://cloudflare-eth.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_call",
        params: [
          { to: universalResolver, data: encodeReverseLookup(address) },
          "latest",
        ],
        id: 1,
      }),
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) return null;
    const data = await response.json();
    if (!data.result || data.result === "0x") return null;

    return decodeENSResult(data.result);
  } catch {
    return null;
  }
}

function encodeReverseLookup(address: string): string {
  const addr = address.toLowerCase().replace("0x", "");
  const reverseName = `${addr}.addr.reverse`;
  const nameBytes = Buffer.from(reverseName, "utf8");

  const selector = "ec11c823";
  const offset =
    "0000000000000000000000000000000000000000000000000000000000000020";
  const length = nameBytes.length.toString(16).padStart(64, "0");
  const data = nameBytes
    .toString("hex")
    .padEnd(Math.ceil(nameBytes.length / 32) * 64, "0");

  return `0x${selector}${offset}${length}${data}`;
}

function decodeENSResult(hexData: string): string | null {
  try {
    if (!hexData || hexData === "0x" || hexData.length < 130) return null;
    const data = hexData.slice(2);
    const tupleOffset = parseInt(data.slice(0, 64), 16) * 2;
    const stringOffset =
      parseInt(data.slice(tupleOffset, tupleOffset + 64), 16) * 2;
    const absStringOffset = tupleOffset + stringOffset;
    const stringLength = parseInt(
      data.slice(absStringOffset, absStringOffset + 64),
      16
    );
    if (stringLength === 0 || stringLength > 256) return null;
    const stringHex = data.slice(
      absStringOffset + 64,
      absStringOffset + 64 + stringLength * 2
    );
    const name = Buffer.from(stringHex, "hex").toString("utf8");
    if (name && name.includes(".") && name.length > 3) return name;
    return null;
  } catch {
    return null;
  }
}

// ─── Main Resolution ─────────────────────────────────────────────────

/**
 * Resolve a single address to a display name.
 *
 * Priority: OpenSea username → ENS name → null
 * (Manual tags are checked separately at the API/page level)
 */
export async function resolveDisplayName(
  address: string
): Promise<string | null> {
  const lowerAddress = address.toLowerCase();
  const cacheKey = `ens-${lowerAddress}`;

  // Check auto-resolution cache first
  const cached = await cache.get<{ name: string | null }>(cacheKey);
  if (cached !== null) {
    return cached.name;
  }

  // Try OpenSea first (better coverage for NFT holders)
  let name = await resolveViaOpenSea(lowerAddress);

  // Fallback to ENS
  if (!name) {
    name = await resolveViaENS(lowerAddress);
  }

  // Cache result (even null to avoid repeated lookups)
  await cache.set(cacheKey, { name }, NAME_CACHE_TTL);

  return name;
}

/**
 * Batch resolve display names for multiple addresses.
 * Resolves in parallel with concurrency limit.
 */
export async function batchResolveDisplayNames(
  addresses: string[],
  maxConcurrent = 5
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();
  const uniqueAddresses = [
    ...new Set(addresses.map((a) => a.toLowerCase())),
  ];

  // Check cache for all addresses first
  const uncached: string[] = [];
  for (const address of uniqueAddresses) {
    const cacheKey = `ens-${address}`;
    const cached = await cache.get<{ name: string | null }>(cacheKey);
    if (cached !== null) {
      results.set(address, cached.name);
    } else {
      uncached.push(address);
    }
  }

  // Resolve uncached in batches
  for (let i = 0; i < uncached.length; i += maxConcurrent) {
    const batch = uncached.slice(i, i + maxConcurrent);
    const batchResults = await Promise.allSettled(
      batch.map(async (address) => {
        const name = await resolveDisplayName(address);
        return { address, name };
      })
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.set(result.value.address, result.value.name);
      } else {
        const address = batch[batchResults.indexOf(result)];
        results.set(address, null);
      }
    }
  }

  return results;
}
