import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Generate realistic mock data based on current stats
async function generateMockSnapshot(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const dateStr = date.toISOString().split('T')[0];

  // Base values with some realistic variation
  const priceVariation = 1 + (Math.random() - 0.5) * 0.3; // ±15% variation
  const volumeVariation = 0.5 + Math.random() * 1.5; // 50-200% variation
  const burnedBase = 211148671.86 - (daysAgo * 500000); // Gradually less burned going back in time

  const mockData = {
    price_usd: 0.0109867 * priceVariation,
    price_change_24h: (Math.random() - 0.5) * 10, // ±5% daily change
    volume_24h: 73376 * volumeVariation,
    liquidity_usd: 1728133.95 * (0.9 + Math.random() * 0.2), // ±10%
    market_cap_usd: 8666907.79 * priceVariation,
    burnedAmount: Math.max(burnedBase, 200000000).toString() + '000000000000', // In wei
    holdingsCount: 353 + Math.floor((Math.random() - 0.5) * 10),
    currentFees: (0.5624 * (0.8 + Math.random() * 0.4)).toString() + '000000000000',
    poolData: {
      price_usd: 0.0109867 * priceVariation,
      price_change_24h: (Math.random() - 0.5) * 10,
      volume_24h: 73376 * volumeVariation,
      liquidity_usd: 1728133.95 * (0.9 + Math.random() * 0.2),
      market_cap_usd: 8666907.79 * priceVariation
    },
    floor: {
      tokenId: '1234',
      price: '0.887',
      image: '',
      name: 'GVC #1234',
      owner: '0x0000000000000000000000000000000000000000'
    }
  };

  return {
    date: dateStr,
    timestamp: date.getTime(),
    data: mockData
  };
}

async function backfillSnapshots() {
  try {
    console.log('Backfilling historical snapshots...\n');

    const days = 90; // Backfill 90 days
    const snapshots = [];

    // Generate snapshots for each day
    for (let i = days; i >= 1; i--) {
      const snapshot = await generateMockSnapshot(i);
      snapshots.push(snapshot);
    }

    console.log(`Generated ${snapshots.length} mock snapshots`);
    console.log(`Date range: ${snapshots[0].date} to ${snapshots[snapshots.length - 1].date}\n`);

    // Insert snapshots into database
    for (const snapshot of snapshots) {
      await sql`
        INSERT INTO vibestr_snapshots (date, timestamp, data)
        VALUES (${snapshot.date}, ${snapshot.timestamp}, ${JSON.stringify(snapshot.data)}::jsonb)
        ON CONFLICT (date) DO UPDATE
        SET timestamp = ${snapshot.timestamp},
            data = ${JSON.stringify(snapshot.data)}::jsonb
      `;
    }

    console.log('✓ Snapshots inserted successfully\n');

    // Update metadata
    await sql`
      UPDATE vibestr_snapshot_meta
      SET first_snapshot = ${snapshots[0].date},
          last_snapshot = ${snapshots[snapshots.length - 1].date},
          snapshot_count = ${snapshots.length},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `;

    console.log('✓ Metadata updated');

    // Verify
    const count = await sql`SELECT COUNT(*) as count FROM vibestr_snapshots`;
    console.log(`\nTotal snapshots in database: ${count.rows[0].count}`);

    process.exit(0);
  } catch (error) {
    console.error('Error backfilling snapshots:', error);
    process.exit(1);
  }
}

backfillSnapshots();
