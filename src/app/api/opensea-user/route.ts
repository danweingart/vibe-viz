import { NextRequest, NextResponse } from "next/server";

const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY;

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Address required" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://api.opensea.io/api/v2/accounts/${address}`,
      {
        headers: {
          Accept: "application/json",
          ...(OPENSEA_API_KEY && { "X-API-KEY": OPENSEA_API_KEY }),
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json({ username: null });
    }

    const data = await response.json();
    return NextResponse.json({
      username: data.username || null,
      profileUrl: data.profile_url || null,
    });
  } catch {
    return NextResponse.json({ username: null });
  }
}
