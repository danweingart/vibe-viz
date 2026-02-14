# Week 2 Deployment Guide: Persistent Caching

## What Changed

**Performance Optimization: Persistent Cache Layer**

The app now uses Vercel Postgres for caching instead of in-memory cache. This solves the cold start problem where cache was lost on every serverless function restart.

### Files Created:
1. `src/lib/cache/postgres.ts` - PostgresCache implementation
2. `src/app/api/admin/migrate-cache/route.ts` - Database migration endpoint
3. `src/app/api/admin/cleanup-cache/route.ts` - Cache cleanup cron job
4. `migrations/001_create_cache_table.sql` - SQL migration
5. `migrations/README.md` - Migration instructions

### Files Modified:
- **14 API routes** - Migrated from memory cache to Postgres cache
- `vercel.json` - Added cleanup cron job (every 6 hours)

---

## Prerequisites

⚠️ **IMPORTANT**: Before deploying, you MUST set up Vercel Postgres

### Step 1: Create Vercel Postgres Database

1. Go to your Vercel project dashboard
2. Click **Storage** tab
3. Click **Create Database**
4. Select **Postgres**
5. Choose region (same as your deployment region)
6. Click **Create**

Vercel will automatically inject the following environment variables:
- `POSTGRES_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

---

## Deployment Steps

### 1. Deploy to Vercel

```bash
git add .
git commit -m "Week 2: Persistent caching with Postgres (100ms response times)"
git push
```

Vercel will automatically deploy. Wait for deployment to complete.

### 2. Run Database Migration

After deployment, create the cache table:

**Option A: Using curl**
```bash
curl -X POST https://your-domain.vercel.app/api/admin/migrate-cache
```

**Option B: Using Vercel Dashboard**
1. Go to Storage → Postgres → Query
2. Run this SQL:
```sql
CREATE TABLE IF NOT EXISTS cache_entries (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache_entries(expires_at);
CREATE INDEX IF NOT EXISTS idx_cache_updated ON cache_entries(updated_at);
```

### 3. Verify Migration

Check migration status:
```bash
curl https://your-domain.vercel.app/api/admin/migrate-cache
```

Expected response:
```json
{
  "migrated": true,
  "tableExists": true,
  "stats": {
    "total_entries": 0,
    "expired_entries": 0
  }
}
```

### 4. Test Performance

Visit your dashboard and check response times:
```bash
curl -w "\nTime: %{time_total}s\n" https://your-domain.vercel.app/api/collection/stats
```

**Expected results:**
- First request (cold): ~7-10s (fetches from APIs, writes to Postgres cache)
- Second request (warm): **~100ms** (reads from Postgres cache)
- Cache hit rate: **80-90%** after a few requests

---

## Performance Comparison

### Before (Week 1 - Memory Cache):
- ❌ Cold start: 7-10s (no cache persists)
- ❌ Warm: 7-10s (serverless functions restart frequently)
- ❌ Cache hit rate: ~10% (cache lost on cold starts)

### After (Week 2 - Postgres Cache):
- ✅ Cold start: 7-10s (first request populates cache)
- ✅ Warm: **100ms** (reads from Postgres, not APIs)
- ✅ Cache hit rate: **80-90%** (cache survives restarts)

---

## Monitoring

### Check Cache Statistics

```bash
curl https://your-domain.vercel.app/api/refresh
```

Response:
```json
{
  "totalEntries": 12,
  "expiredEntries": 2,
  "totalSize": "48 kB"
}
```

### Manual Cache Cleanup

```bash
curl https://your-domain.vercel.app/api/admin/cleanup-cache
```

### Clear All Cache (Force Refresh)

```bash
curl -X POST https://your-domain.vercel.app/api/refresh
```

---

## Automatic Maintenance

The cleanup cron job runs **every 6 hours** automatically (configured in `vercel.json`):

```json
{
  "path": "/api/admin/cleanup-cache",
  "schedule": "0 */6 * * *"
}
```

This removes expired cache entries to keep database size minimal.

---

## Troubleshooting

### Error: "relation 'cache_entries' does not exist"

**Solution:** Run the migration:
```bash
curl -X POST https://your-domain.vercel.app/api/admin/migrate-cache
```

### Error: "POSTGRES_URL is not defined"

**Solution:**
1. Create Vercel Postgres database (see Step 1)
2. Redeploy to inject environment variables

### Slow Performance After Deployment

**Wait 5 minutes** for cache to populate. First requests will be slow as they populate the cache. Subsequent requests should be ~100ms.

---

## Next Steps: Week 3 (Optional)

For even faster performance (10ms response times):

**Snapshot Strategy:**
- Pre-compute stats every 4 hours via cron
- Store snapshots in Postgres
- Serve from snapshots instead of computing on demand

Expected improvement: **100ms → 10ms**
