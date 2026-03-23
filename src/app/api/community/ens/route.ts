import { NextRequest, NextResponse } from "next/server";
import { batchResolveDisplayNames } from "@/lib/ens/resolver";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const addresses: string[] = body.addresses || [];

    if (addresses.length === 0) {
      return NextResponse.json({});
    }

    // Limit to 30 addresses per request
    const limited = addresses.slice(0, 30);
    const results = await batchResolveDisplayNames(limited, 3);

    // Convert Map to plain object
    const response: Record<string, string | null> = {};
    for (const [address, name] of results) {
      response[address] = name;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("ENS resolution error:", error);
    return NextResponse.json({});
  }
}
