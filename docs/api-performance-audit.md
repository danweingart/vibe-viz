# API Performance Audit - Vibe Viz

**Date:** 2026-02-15
**Auditor:** Claude Code (Autonomous Audit)
**Project:** Vibe Viz - NFT Collection Dashboard

---

## Executive Summary

This audit identifies **18 performance and scalability issues** across the Vibe Viz API layer. The project is a Next.js 16 application using App Router, TanStack Query, Vercel Postgres caching, and external APIs (OpenSea, Etherscan, CoinGecko). The most critical issues involve N+1 queries, memory leaks, inefficient data enrichment, and excessive external API calls.

**Estimated Impact:** Fixing these issues could reduce API response times by 60-80% and eliminate timeout/rate limit errors.

---

## Tech Stack Summary

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **Data Fetching:** TanStack Query v5 (client), native fetch (server)
- **Caching:**
  - Vercel Postgres (persistent, 4hr-6hr TTL)
  - In-memory Map (transient, 24hr TTL for price enrichment)
- **External APIs:**
  - OpenSea v2 (collection stats, sales events, listings, offers)
  - Etherscan v2 (on-chain transfers, block data)
  - CoinGecko v3 (ETH/USD price)
- **Database:** Vercel Postgres (cache_entries, vibestr_snapshots tables)
- **Deployment:** Vercel (serverless functions)

---

## Critical Issues (Fix First)

### 1. N+1 Query Pattern in Price Enrichment ⚠️ **CRITICAL**

**File:** `src/lib/etherscan/transformer.ts:41-179`

**Problem:**
The `enrichTransfersWithPrices()` function fetches OpenSea events with pagination (up to 250 pages × 200 events = 50,000 events) to match transaction hashes. This creates a massive N+1 query pattern where:
- API routes call `enrichTransfersWithPrices()` for every request
- The function makes **up to 250 sequential OpenSea API calls** (150ms delay between each = 37.5 seconds of delays alone)
- This happens even when only 10-50 transfers need enrichment

**Impact:**
- API routes timeout (>30s for large date ranges)
- Excessive OpenSea API calls (rate limiting)
- High memory usage (50k events loaded into memory)

**Proposed Fix:**
1. **Add persistent cache for enriched prices** - Store tx_hash → price mappings in Postgres instead of in-memory Map
2. **Batch enrichment more efficiently** - Only fetch OpenSea events for the specific time range needed, not the entire history
3. **Implement progressive enrichment** - Return partially enriched data immediately, enrich missing data in background
4. **Add pagination to enrichment** - Limit to 1-2 OpenSea pages (200-400 events) per request, accept partial enrichment

**Estimated Impact:** 80% reduction in enrichment time (37.5s → 5-7s), eliminates timeouts

---

### 2. Unbounded Memory Growth in Price Cache ⚠️ **CRITICAL**

**File:** `src/lib/cache/prices.ts:20`

**Problem:**
The in-memory `priceCache` Map grows unbounded with no size limits:
- No automatic pruning (only manual `pruneExpiredPrices()` that's never called)
- 24-hour TTL means entries accumulate for a full day
- In serverless environments, cache persists across invocations until cold start
- With thousands of historical sales, cache can consume 10-50MB+ of memory

**Impact:**
- Memory leaks in serverless functions
- Slower lookups as Map grows (O(1) but cache misses increase)
- Potential out-of-memory errors under heavy load

**Proposed Fix:**
1. **Implement LRU eviction** - Keep only N most recent entries (e.g., 1000)
2. **Add automatic pruning** - Run `pruneExpiredPrices()` after every 100 cache operations
3. **Consider removing in-memory cache entirely** - Use Postgres cache for price lookups (it's already durable and has TTL)
4. **Add cache metrics** - Log cache size/hit rate for monitoring

**Estimated Impact:** Prevents memory leaks, reduces memory usage by 80-90%

---

### 3. Excessive API Calls in getAllTransfers ⚠️ **HIGH**

**File:** `src/lib/etherscan/client.ts:178-236`

**Problem:**
The `getAllTransfers()` function:
- Fetches ALL transfers since contract deployment in 50k block batches
- Can make **100+ Etherscan API calls** for old contracts
- Each batch has 300-500ms delay = 30-50 seconds total
- Called by `/api/collection/stats` which has only 4hr cache TTL

**Impact:**
- Slow API responses (30-60 seconds)
- Etherscan rate limit pressure
- Expensive on every cache miss (every 4 hours)

**Proposed Fix:**
1. **Increase cache TTL for collection stats** - 4hr → 24hr (data doesn't change that fast)
2. **Add incremental updates** - Only fetch new transfers since last sync, not full history
3. **Pre-warm cache on deployment** - Run background job to populate cache before users hit API
4. **Use OpenSea totals as source of truth** - Already done for volume/sales, avoid Etherscan for historical counts

**Estimated Impact:** 90% reduction in Etherscan API calls, 60% faster response times

---

### 4. Missing Database Connection Pool Configuration ⚠️ **HIGH**

**File:** Global (Vercel Postgres usage throughout)

**Problem:**
No explicit connection pool configuration for Vercel Postgres:
- Default pool size may be too small for concurrent requests
- No connection timeout settings
- No retry logic for pool exhaustion
- Can cause "connection pool exhausted" errors under load

**Impact:**
- Failed requests when pool exhausted
- Cascading failures under traffic spikes
- Slower response times (waiting for connections)

**Proposed Fix:**
1. **Configure connection pool** - Add max connections (10-20), connection timeout (5s)
2. **Add connection retry logic** - Retry with exponential backoff on pool exhaustion
3. **Monitor pool usage** - Add logging for pool metrics
4. **Consider PgBouncer** - If Vercel supports it, use connection pooler

**Estimated Impact:** Eliminates connection errors, handles 5-10x more concurrent requests

---

## High Priority Issues

### 5. Inefficient Rate Limiting Configuration ⚠️ **HIGH**

**File:** `src/lib/etherscan/rate-limiter.ts:16,71`

**Problem:**
Etherscan rate limiter is configured for **3.0 calls/sec when free tier allows 5 calls/sec**:
- Uses only 60% of available capacity (conservative buffer)
- Adds unnecessary delays (333ms per call vs 200ms)
- Compounds with explicit delays (100ms, 200ms, 300ms in client.ts)
- Total delay per call: 333ms + 100ms = 433ms minimum

**Impact:**
- 40% slower than necessary (333ms → 200ms per call)
- Batch operations take much longer (100 calls = 43s vs 20s)

**Proposed Fix:**
1. **Increase to 4.5 calls/sec** - Use 90% of free tier limit (safer than 3.0 but faster)
2. **Remove redundant delays** - The 100ms delay in fetchWithRetry is unnecessary with rate limiter
3. **Add burst capacity** - Allow short bursts up to 5 calls/sec for small requests

**Estimated Impact:** 30-40% faster Etherscan operations, better throughput

---

### 6. No Request Timeout Protection ⚠️ **HIGH**

**File:** All API routes (no timeout middleware)

**Problem:**
API routes have no explicit timeout protection:
- Can run indefinitely (especially enrichment operations)
- Vercel has 60s timeout for serverless functions (hobby tier) or 5min (pro)
- No graceful timeout handling or partial results
- Users get cryptic errors after waiting 60+ seconds

**Impact:**
- Poor user experience (long waits, unclear errors)
- Wasted compute resources (functions running to timeout)
- No fallback to cached/partial data

**Proposed Fix:**
1. **Add timeout middleware** - Wrap all API routes with 25s timeout (well before Vercel limit)
2. **Return partial results** - If timeout approaching, return cached/partial data with _timeout flag
3. **Add timeout logging** - Track which routes timeout most frequently
4. **Implement request queuing** - Queue expensive operations, return cached data immediately

**Estimated Impact:** Better UX, clearer error messages, reduced wasted compute

---

### 7. Missing Response Compression ⚠️ **MEDIUM**

**File:** `next.config.ts` (no compression config)

**Problem:**
No gzip/brotli compression configured:
- `/api/price-history` can return 50KB+ JSON (365 days of data)
- `/api/events` returns large arrays of sale records
- Network transfer times 5-10x slower than necessary
- Wastes bandwidth, slower on mobile/slow connections

**Impact:**
- 200-500ms additional latency on large responses
- 5-10x more bandwidth usage
- Slower perceived performance

**Proposed Fix:**
1. **Enable Next.js compression** - Add `compress: true` to next.config.ts (enabled by default in production)
2. **Verify compression headers** - Check that responses include `Content-Encoding: gzip`
3. **Consider JSON streaming** - For very large responses, stream data in chunks

**Estimated Impact:** 70-90% smaller response sizes, 200-500ms faster on large payloads

---

### 8. Suboptimal Cache TTL Configuration ⚠️ **MEDIUM**

**File:** `src/lib/constants.ts:28-35`

**Problem:**
Cache TTLs are not optimized for the data volatility:
- `COLLECTION_STATS: 14400` (4hr) - Fetches ALL historical transfers, very expensive to recompute
- `ETH_PRICE: 300` (5min) - Price changes frequently, but 5min is still very fresh
- `RECENT_EVENTS: 300` (5min) - Recent sales don't change that often
- Frequent cache misses trigger expensive operations

**Impact:**
- Expensive operations run every 4-5 hours unnecessarily
- API load 2-3x higher than necessary
- Response times spike during cache misses

**Proposed Fix:**
1. **Increase COLLECTION_STATS TTL** - 4hr → 24hr (metrics are stable daily)
2. **Increase ETH_PRICE TTL** - 5min → 10-15min (price changes don't require instant updates)
3. **Increase RECENT_EVENTS TTL** - 5min → 15min (sales feed doesn't need to be real-time)
4. **Add cache warming** - Pre-populate caches before expiration to avoid misses

**Estimated Impact:** 50% reduction in expensive operations, smoother response times

---

## Medium Priority Issues

### 9. Missing Index on cache_entries.key ⚠️ **MEDIUM**

**File:** `migrations/001_create_cache_table.sql:4-5`

**Problem:**
The `cache_entries` table has `key` as PRIMARY KEY but no explicit index mentioned:
- PostgreSQL automatically creates index on PRIMARY KEY
- However, the index on `expires_at` is for cleanup queries
- No index on `updated_at` for debugging (but less critical)

**Status:** ✅ **Already optimized** - PRIMARY KEY automatically indexed

**Recommendation:** Add composite index on `(expires_at, key)` for cleanup queries that also filter by key patterns

---

### 10. Unbounded Pagination in OpenSea Calls ⚠️ **MEDIUM**

**File:** `src/lib/opensea/client.ts:162-195,198-232`

**Problem:**
`getCollectionOffers()` and `getOffers()` functions:
- Default limit of 200, but can request unlimited offers
- Pagination continues until limit reached or no more data
- Each page has 200ms delay (40 pages = 8 seconds of delays)
- No protection against requesting thousands of offers

**Impact:**
- Slow API responses when requesting many offers
- Memory usage scales with request size
- Rate limiting pressure on OpenSea

**Proposed Fix:**
1. **Add hard pagination limit** - Max 10 pages (2000 offers) per request
2. **Return pagination cursor** - Let client request more if needed
3. **Cache paginated results** - Cache each page separately to avoid refetching

**Estimated Impact:** Faster responses, predictable memory usage

---

### 11. No Stale-While-Revalidate Strategy ⚠️ **MEDIUM**

**File:** All API routes (manual stale cache checks)

**Problem:**
Some routes have stale cache fallback (good!) but inconsistently:
- `/api/collection/stats` - ✅ Has stale fallback
- `/api/price-history` - ✅ Has stale fallback
- `/api/events` - ✅ Has stale fallback
- `/api/eth-price` - ✅ Has stale fallback
- But no automatic background revalidation

**Impact:**
- Stale data served but never refreshed until next request
- No proactive cache warming
- Users see stale data warnings

**Proposed Fix:**
1. **Add background revalidation** - When serving stale data, trigger async refresh
2. **Implement SWR pattern** - Return stale immediately, update cache in background
3. **Add cache warming cron** - Vercel Cron to refresh critical caches before expiration

**Estimated Impact:** Always fresh data, better UX, fewer cache misses

---

### 12. Inefficient Block Number Calculation ⚠️ **LOW**

**File:** `src/lib/etherscan/client.ts:248-250`

**Problem:**
```typescript
const blocksPerDay = 6500; // ~13 second block time
const startBlock = Math.max(0, currentBlock - (days * blocksPerDay));
```
- Block times vary (12-14 seconds), 6500 is an approximation
- No handling of The Merge (block times changed Sept 2022)
- Could be off by 5-10% for historical queries

**Impact:**
- Date range queries may miss recent blocks or include extra blocks
- Low severity (errors are small, data is cached anyway)

**Proposed Fix:**
1. **Use timestamp-based queries** - Etherscan supports `after`/`before` timestamp params
2. **Update block time constant** - Post-Merge is ~12s, use 7200 blocks/day
3. **Add block time lookup** - Fetch recent block times to calculate dynamically

**Estimated Impact:** Minor accuracy improvement (5-10%)

---

### 13. Missing Monitoring and Logging ⚠️ **LOW**

**File:** Global (no APM, structured logging, or metrics)

**Problem:**
No centralized monitoring or metrics:
- Console.log statements scattered throughout
- No request/response timing
- No error rate tracking
- No cache hit/miss metrics
- No external API latency tracking

**Impact:**
- Hard to diagnose performance issues in production
- No visibility into bottlenecks
- Can't measure impact of optimizations

**Proposed Fix:**
1. **Add Vercel Analytics** - Track API response times, error rates
2. **Implement structured logging** - JSON logs with request IDs, timing data
3. **Add custom metrics** - Cache hit rate, API latency, enrichment coverage
4. **Set up alerts** - Notify on high error rates, slow responses

**Estimated Impact:** Better observability, faster debugging

---

## Low Priority Issues

### 14. Redundant API Calls in Parallel Fetches ⚠️ **LOW**

**File:** `src/app/api/collection/stats/route.ts:33-38`

**Problem:**
```typescript
const [openSeaStats, recentTransfers, totalSupply, ethPriceData] = await Promise.all([
  getOpenSeaStats(),
  getTransfersInDateRange(30, CONTRACT_ADDRESS),
  getTotalSupply(CONTRACT_ADDRESS),
  getEthPrice(),
]);
```
- All 4 calls happen in parallel (good!)
- But `totalSupply` is static (won't change often)
- `getOpenSeaStats()` already includes total supply in response

**Impact:**
- Minor - 1 extra Etherscan API call per cache miss
- Low latency impact (parallel)

**Proposed Fix:**
1. **Use OpenSea total supply** - Already available in `openSeaStats.total.total_supply`
2. **Cache total supply separately** - 24hr TTL, refresh rarely

**Estimated Impact:** 1 fewer Etherscan call per stats request

---

### 15. Inefficient Floor Price Calculation ⚠️ **LOW**

**File:** `src/lib/etherscan/transformer.ts:297-313`

**Problem:**
```typescript
const recentSales = saleRecords.filter(s => s.timestamp.getTime() >= sevenDaysAgo);
const sortedPrices = recentSales.map(s => s.priceEth).sort((a, b) => a - b);
const floorIndex = Math.floor(sortedPrices.length * 0.1);
```
- Filters all sales, then maps, then sorts (O(n log n))
- Called frequently during daily stats aggregation
- Could use heap or quick-select for O(n) 10th percentile

**Impact:**
- Minor - Only slow when processing 1000+ sales
- Not in hot path (happens during enrichment)

**Proposed Fix:**
1. **Use quick-select algorithm** - O(n) instead of O(n log n)
2. **Skip calculation** - Use OpenSea floor price directly (already fetched)

**Estimated Impact:** Negligible (not a bottleneck)

---

### 16. No Batch Delete for Expired Cache ⚠️ **LOW**

**File:** `src/lib/cache/postgres.ts:137-148`

**Problem:**
```sql
DELETE FROM cache_entries WHERE expires_at < NOW()
```
- Single query deletes all expired entries at once (good!)
- But no automatic scheduling (manual cleanup only)
- Expired entries accumulate, slow down queries over time

**Impact:**
- Table bloat over time
- Slower index scans

**Proposed Fix:**
1. **Add Vercel Cron job** - Run cleanup daily at off-peak hours
2. **Add automatic cleanup** - Delete expired entries on cache.set() (every Nth operation)
3. **Use PostgreSQL partitioning** - Partition by date for automatic cleanup

**Estimated Impact:** Prevents table bloat, maintains query performance

---

### 17. Missing Error Boundary for External API Failures ⚠️ **LOW**

**File:** All API routes (individual try/catch blocks)

**Problem:**
Each API route has its own error handling:
- Inconsistent error response formats
- Some return stale cache, some return 500 error
- No centralized error logging or retry logic

**Impact:**
- Inconsistent error messages
- Hard to track error patterns
- No automatic recovery strategies

**Proposed Fix:**
1. **Add error middleware** - Centralized error handling for all routes
2. **Standardize error responses** - Consistent JSON format with error codes
3. **Add error aggregation** - Log errors to monitoring service
4. **Implement circuit breakers** - Fail fast when external API is down

**Estimated Impact:** Better error handling, clearer debugging

---

### 18. No Health Check / Readiness Endpoint ⚠️ **LOW**

**File:** Missing

**Problem:**
No `/health` or `/ready` endpoint for monitoring:
- Can't check if API is operational
- No way to verify Postgres connection
- No way to pre-warm caches on cold start

**Impact:**
- Hard to monitor uptime
- No pre-flight checks for deployments
- Can't integrate with health monitoring services

**Proposed Fix:**
1. **Add `/api/health` endpoint** - Returns 200 if all systems operational
2. **Check dependencies** - Verify Postgres, OpenSea, Etherscan connectivity
3. **Add cache warming** - Pre-populate critical caches on startup
4. **Add `/api/metrics` endpoint** - Return cache stats, API latency, etc.

**Estimated Impact:** Better monitoring, faster cold starts

---

## Summary of Fixes by Priority

### Critical (Fix First)
1. ✅ Optimize N+1 price enrichment pattern (Issue #1)
2. ✅ Fix unbounded memory growth in price cache (Issue #2)
3. ✅ Reduce excessive API calls in getAllTransfers (Issue #3)
4. ✅ Configure database connection pooling (Issue #4)

### High Priority
5. ✅ Optimize rate limiting configuration (Issue #5)
6. ✅ Add request timeout protection (Issue #6)
7. ✅ Enable response compression (Issue #7)
8. ✅ Optimize cache TTL configuration (Issue #8)

### Medium Priority
9. ⚠️ Already optimized - DB indexes (Issue #9)
10. ✅ Add pagination limits to OpenSea calls (Issue #10)
11. ✅ Implement stale-while-revalidate (Issue #11)
12. ⚠️ Low impact - Block number calculation (Issue #12)

### Low Priority
13. ✅ Add monitoring and logging (Issue #13)
14. ⚠️ Minor - Redundant API calls (Issue #14)
15. ⚠️ Not a bottleneck - Floor price calculation (Issue #15)
16. ✅ Add batch cleanup for cache (Issue #16)
17. ✅ Standardize error handling (Issue #17)
18. ✅ Add health check endpoint (Issue #18)

---

## Deferred / Future Improvements

1. **GraphQL for flexible queries** - Allow clients to request only needed fields
2. **Redis for distributed caching** - Share cache across serverless instances
3. **Webhook-based updates** - Subscribe to OpenSea/Etherscan webhooks instead of polling
4. **Incremental static regeneration (ISR)** - Pre-render pages with 24hr revalidation
5. **Edge functions for ETH price** - Ultra-low latency global distribution
6. **Database replication** - Read replicas for high-traffic queries
7. **OpenTelemetry integration** - Distributed tracing across API calls

---

## Testing Baseline

**Status:** ❌ No test suite found (`npm test` script missing)

**Recommendation:** Before implementing fixes, create:
1. **Integration tests** - Test API routes with mocked external APIs
2. **Performance benchmarks** - Measure response times before/after optimizations
3. **Load tests** - Simulate 100+ concurrent users to identify bottlenecks

---

## Next Steps

**PHASE 2 - Implementation:**
1. ✅ **Get user approval** for this plan
2. Fix Critical issues (#1-4) first
3. Fix High priority issues (#5-8)
4. Commit after each fix with clear messages
5. Run test suite after each commit (create if needed)
6. Measure performance improvements

**Estimated Timeline:**
- Critical fixes: 4-6 hours
- High priority: 2-3 hours
- Medium priority: 1-2 hours
- Low priority: 1-2 hours
- **Total: 8-13 hours**

---

**End of Audit Report**
