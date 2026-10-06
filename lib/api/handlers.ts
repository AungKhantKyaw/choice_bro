import { NextResponse } from "next/server";
import { buildVerdict, parseQuery } from "../ai";
import { searchCategory } from "../search";
import { Category } from "../types";

const errorDetails = (e: unknown) => (e instanceof Error ? e.message : String(e));

export async function handleChat(category: Category, request: Request) {
  try {
    const { message } = await request.json();
    if (typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message is required bro" }, { status: 400 });
    }
    return NextResponse.json(await parseQuery(category, message));
  } catch (error) {
    console.error(`[chat:${category}] failure:`, error);
    return NextResponse.json(
      { error: "Failed to process AI query", details: errorDetails(error) },
      { status: 500 },
    );
  }
}

export async function handleSearch(category: Category, request: Request) {
  try {
    const { query, storePreference, maxPrice } = await request.json();

    if (typeof query !== "string" || query.trim().length < 2) {
      return NextResponse.json({ error: "Search term must be at least 2 characters" }, { status: 400 });
    }

    const outcome = await searchCategory(category, query.trim(), {
      storePreference: typeof storePreference === "string" ? storePreference : null,
      maxPrice: typeof maxPrice === "number" ? maxPrice : null,
    });
    return NextResponse.json(outcome);
  } catch (error) {
    console.error(`[search:${category}] failure:`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function handleVerdict(category: Category, request: Request) {
  try {
    const { products, query } = await request.json();
    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: "No listings available to analyze bro" }, { status: 400 });
    }
    return NextResponse.json(await buildVerdict(category, query, products));
  } catch (error) {
    console.error(`[verdict:${category}] failure:`, error);
    return NextResponse.json(
      { error: "Failed to generate Bro verdict logic", details: errorDetails(error) },
      { status: 500 },
    );
  }
}
