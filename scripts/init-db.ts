import { sql } from '@vercel/postgres';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function initDatabase() {
  try {
    console.log('Initializing VIBESTR database tables...');

    // Read schema file
    const schemaPath = path.join(process.cwd(), 'src/lib/db/schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf-8');

    // Execute schema
    await sql.query(schema);

    console.log('✓ Database tables created successfully');

    // Check if tables exist
    const result = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'vibestr%'
    `;

    console.log('\nCreated tables:');
    result.rows.forEach((row) => {
      console.log(`  - ${row.table_name}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initDatabase();
