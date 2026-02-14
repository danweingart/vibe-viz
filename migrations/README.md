# Database Migrations

This directory contains SQL migrations for the Vibe Viz database.

## Prerequisites

1. Vercel Postgres database configured in your Vercel project
2. Project deployed to Vercel (or running locally with postgres connection)

## Running Migrations

### Option 1: API Endpoint (Recommended)

After deploying, call the migration endpoint:

```bash
# Run migration
curl -X POST https://your-domain.vercel.app/api/admin/migrate-cache

# Check migration status
curl https://your-domain.vercel.app/api/admin/migrate-cache
```

### Option 2: Vercel Dashboard

1. Go to your Vercel project dashboard
2. Navigate to Storage → Postgres → Query
3. Copy and paste the contents of `001_create_cache_table.sql`
4. Click "Run Query"

### Option 3: Local Development

If running locally with Vercel Postgres:

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Link your project
vercel link

# Pull environment variables
vercel env pull .env.local

# The migration will run automatically on first cache access
# Or manually call the endpoint:
curl -X POST http://localhost:3000/api/admin/migrate-cache
```

## Migrations List

- **001_create_cache_table.sql** - Creates persistent cache table with indexes

## Cache Cleanup

The cache cleanup cron job runs automatically every 6 hours to remove expired entries.

Manual cleanup:
```bash
curl https://your-domain.vercel.app/api/admin/cleanup-cache
```

## Verification

After migration, verify the table was created:

```sql
SELECT * FROM cache_entries LIMIT 10;
```

Check cache statistics:
```bash
curl https://your-domain.vercel.app/api/admin/migrate-cache
```
