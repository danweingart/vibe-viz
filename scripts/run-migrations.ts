/**
 * Run database migrations
 *
 * This script applies all pending migrations to the Postgres database.
 */

import 'dotenv/config';
import { sql } from '@vercel/postgres';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runMigrations() {
  console.log('🚀 Running database migrations...\n');

  try {
    // Migration 1: Cache entries table (already exists from auto-migration)
    console.log('✓ Migration 001: cache_entries table (auto-created)');

    // Migration 2: Price cache table
    console.log('📝 Migration 002: Creating price_cache table...');
    const migration002 = readFileSync(
      join(process.cwd(), 'migrations', '002_create_price_cache_table.sql'),
      'utf-8'
    );

    // Execute migration
    await sql.query(migration002);
    console.log('✓ Migration 002: price_cache table created successfully\n');

    // Verify tables exist
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    console.log('📊 Current database tables:');
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    console.log('\n✅ All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runMigrations();
