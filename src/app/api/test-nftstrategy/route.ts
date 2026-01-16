import { NextResponse } from 'next/server';
import { fetchAllNFTData } from '@/lib/nftstrategy/client';

export async function GET() {
  try {
    console.log('Testing NFTStrategy client...');
    const data = await fetchAllNFTData();
    console.log(`Got ${data.holdings.length} holdings and ${data.sold.length} sold`);
    
    return NextResponse.json({
      success: true,
      holdingsCount: data.holdings.length,
      soldCount: data.sold.length,
      sampleHolding: data.holdings[0],
      sampleSold: data.sold[0],
    });
  } catch (error: any) {
    console.error('Test failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
