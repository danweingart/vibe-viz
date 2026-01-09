import { NextRequest, NextResponse } from "next/server";
import { getEvents, getPaymentToken, parseEventPrice } from "@/lib/opensea/client";
import { getEthPrice } from "@/lib/coingecko/client";
import type { SaleRecord } from "@/types/api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const eventType = (searchParams.get("type") as "sale" | "transfer" | "listing") || "sale";
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const cursor = searchParams.get("cursor") || undefined;
    const days = searchParams.get("days") ? parseInt(searchParams.get("days")!) : undefined;

    // Calculate timestamp for time range filter
    const after = days
      ? Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000)
      : undefined;

    const [events, ethPrice] = await Promise.all([
      getEvents({
        eventType,
        limit,
        next: cursor,
        after,
      }),
      getEthPrice(),
    ]);

    const sales: SaleRecord[] = events.asset_events.map((event) => {
      const priceEth = parseEventPrice(event);

      return {
        id: event.order_hash || `${event.transaction}-${event.nft.identifier}`,
        tokenId: event.nft.identifier,
        tokenName: event.nft.name || `Good Vibes Club #${event.nft.identifier}`,
        imageUrl: event.nft.image_url,
        priceEth,
        priceUsd: priceEth * ethPrice.usd,
        paymentToken: getPaymentToken(event.payment?.symbol),
        paymentSymbol: event.payment?.symbol || "ETH",
        seller: event.seller,
        buyer: event.buyer,
        timestamp: new Date(event.event_timestamp * 1000),
        txHash: event.transaction,
      };
    });

    return NextResponse.json({
      events: sales,
      nextCursor: events.next,
      hasMore: !!events.next,
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
