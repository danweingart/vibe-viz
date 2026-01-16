# Database Setup Guide

This project uses Vercel Postgres to store historical VIBESTR snapshot data.

## Quick Setup (5 minutes)

### 1. Create Vercel Postgres Database

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your project (`vibe-viz`)
3. Click on the "Storage" tab
4. Click "Create Database"
5. Choose "Postgres"
6. Give it a name (e.g., `vibe-viz-db`)
7. Select a region (choose one close to your users)
8. Click "Create"

### 2. Connect Database to Project

Vercel will automatically add these environment variables to your project:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

No manual configuration needed! The `@vercel/postgres` SDK will use these automatically.

### 3. Initialize Database Tables

The tables will be created automatically on first use. The `/api/vibestr/snapshot` endpoint calls `initializeTables()` which creates:

- `vibestr_snapshots` - Stores daily snapshots
- `vibestr_snapshot_meta` - Tracks snapshot metadata
- Indexes for optimized queries

**Optional: Initialize manually via Vercel dashboard**
1. Go to Storage → Your Database → Data
2. Click "Query" tab
3. Paste contents of `src/lib/db/schema.sql`
4. Click "Execute"

### 4. Start Collecting Snapshots

Set up a cron job to collect daily snapshots:

#### Option A: Vercel Cron (Recommended)

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/vibestr/snapshot",
    "schedule": "0 0 * * *"
  }]
}
```

This runs daily at midnight UTC.

#### Option B: External Cron Service

Use a service like [cron-job.org](https://cron-job.org) to POST to:
```
https://your-domain.vercel.app/api/vibestr/snapshot
```

### 5. Verify Setup

Check snapshot status:
```bash
curl https://your-domain.vercel.app/api/vibestr/snapshot
```

Should return coverage information for 7, 30, and 90 day periods.

## Local Development

For local development, you have two options:

### Option 1: Use Vercel Postgres Locally

Pull environment variables from Vercel:
```bash
vercel env pull .env.local
```

This downloads the production database credentials to your local environment.

### Option 2: Use Local PostgreSQL

Install PostgreSQL locally and create a database:
```bash
createdb vibe_viz_local
```

Add to `.env.local`:
```
POSTGRES_URL="postgres://username:password@localhost:5432/vibe_viz_local"
```

Run the schema:
```bash
psql vibe_viz_local < src/lib/db/schema.sql
```

## Maintenance

### Check Database Size

Vercel Postgres free tier includes:
- 256 MB storage
- 60 hours compute time per month

Each snapshot is ~5KB, so you can store:
- ~50,000 snapshots (137 years of daily snapshots)

### Clean Old Snapshots (Optional)

Keep only last 90 days:
```typescript
import { cleanOldSnapshots } from "@/lib/db/postgres-vibestr";
await cleanOldSnapshots(90); // Keeps last 90 days
```

Add this to a monthly cron job if needed.

## Troubleshooting

### "relation does not exist" Error

Tables haven't been created yet. Options:
1. Make a POST request to `/api/vibestr/snapshot` to auto-initialize
2. Run schema manually in Vercel dashboard
3. Call `initializeTables()` in any API route

### Connection Issues

Check environment variables are set:
```bash
vercel env ls
```

Ensure `POSTGRES_URL` is present in production environment.

### No Snapshots Appearing

1. Check cron job is running
2. Verify `/api/vibestr/snapshot` POST succeeds
3. Check Vercel function logs for errors
4. Confirm database connection works

## Migration from Filesystem

The old filesystem-based storage (`src/lib/db/vibestr.ts`) has been replaced with Postgres. If you had any snapshots in the `data/vibestr/snapshots/` directory, they can be imported:

```typescript
// Example migration script (not implemented)
const files = fs.readdirSync('data/vibestr/snapshots/');
for (const file of files) {
  const snapshot = JSON.parse(fs.readFileSync(file));
  await saveSnapshot(snapshot.data);
}
```

This is typically not needed since the VIBESTR feature is new.
