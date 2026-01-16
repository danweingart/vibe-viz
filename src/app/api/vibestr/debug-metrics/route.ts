import { NextResponse } from 'next/server';
import { fetchAllNFTData } from '@/lib/nftstrategy/client';

export async function GET() {
  try {
    const { holdings, sold } = await fetchAllNFTData();

    const weiToEth = (wei: number) => wei / 1e18;

    const tvl = holdings.reduce((sum, h) => sum + weiToEth(h.current_price), 0);
    const invested = holdings.reduce((sum, h) => sum + weiToEth(h.bought_price), 0);

    return NextResponse.json({
      holdingsCount: holdings.length,
      soldCount: sold.length,
      sampleHolding: holdings[0],
      tvl,
      invested,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
