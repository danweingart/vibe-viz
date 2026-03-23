import { NextRequest, NextResponse } from "next/server";
import {
  getAllAccountTags,
  setAccountTag,
  deleteAccountTag,
} from "@/lib/ens/resolver";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tags = await getAllAccountTags();
    return NextResponse.json(tags);
  } catch (error) {
    console.error("Error fetching account tags:", error);
    return NextResponse.json({});
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, name } = body;

    if (!address || typeof address !== "string") {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    await setAccountTag(address, name.trim());
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error setting account tag:", error);
    return NextResponse.json(
      { error: "Failed to set tag" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { address } = body;

    if (!address || typeof address !== "string") {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    await deleteAccountTag(address);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting account tag:", error);
    return NextResponse.json(
      { error: "Failed to delete tag" },
      { status: 500 }
    );
  }
}
