import { NextRequest, NextResponse } from "next/server";
import { searchAllRetailers } from "@/lib/orchestrator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return NextResponse.json(
        { error: "Search term must be at least 2 characters" },
        { status: 400 },
      );
    }

    console.log(`Searching for: ${query}`);
    const products = await searchAllRetailers(query.trim());

    return NextResponse.json({ products });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
