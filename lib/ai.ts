import { GoogleGenAI, Type } from "@google/genai";
import { resolveRetailer, retailersFor } from "./retailers";
import { Category, Product } from "./types";

const PARSE_MODEL = process.env.GEMINI_PARSE_MODEL || "gemini-2.5-flash-lite";
const VERDICT_MODEL = process.env.GEMINI_VERDICT_MODEL || "gemini-2.5-flash";

export class MissingApiKeyError extends Error {}

function client() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new MissingApiKeyError("GEMINI_API_KEY is not set (check .env.local)");
  // Created per call so env is always read inside the request scope in Next.js.
  return new GoogleGenAI({ apiKey });
}

const PARSE_PROMPTS: Record<Category, { persona: string; examples: string; productDesc: string }> = {
  tech: {
    persona: `You are ChoiceBro, a sharp, tech-savvy Kiwi shopping assistant.
Your single job is to analyze casual shopping queries and extract structured search parameters.`,
    examples: `- "Find me a cheap monitor under 300 bucks" -> product: "monitor", maxPrice: 300
- "Looking for an iPad at PB Tech" -> product: "iPad", storePreference: "pbtech"
- "Suss out a Nintendo Switch" -> product: "Nintendo Switch"`,
    productDesc: 'The clean generic name or model of the item to search for (e.g., "Logitech G502").',
  },
  grocery: {
    persona: `You are ChoiceBro, a sharp, price-savvy Kiwi grocery shopping assistant.
Your single job is to analyze casual grocery shopping queries and extract structured search parameters.`,
    examples: `- "Find me Milo under 8 bucks" -> product: "Milo", maxPrice: 8
- "Looking for butter at PAK'nSAVE" -> product: "butter", storePreference: "paknsave"
- "Suss out cheapest milk" -> product: "milk"`,
    productDesc: 'The clean generic name or brand of the grocery item to search for (e.g., "Milo", "Pams Butter").',
  },
};

export interface ParsedQuery {
  product: string;
  maxPrice: number | null;
  /** A retailer id we actually scrape for this category, or null. */
  storePreference: string | null;
}

export async function parseQuery(category: Category, message: string): Promise<ParsedQuery> {
  const ai = client();
  const p = PARSE_PROMPTS[category];
  // Only offer the model stores we can actually search.
  const storeIds = retailersFor(category).map((r) => `"${r.id}"`).join(", ");

  const response = await ai.models.generateContent({
    model: PARSE_MODEL,
    contents: message,
    config: {
      systemInstruction: `${p.persona}\n\nExamples:\n${p.examples}`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          product: { type: Type.STRING, description: p.productDesc },
          maxPrice: {
            type: Type.INTEGER,
            description: "The maximum budget specified by the user in New Zealand Dollars, or null if not stated.",
          },
          storePreference: {
            type: Type.STRING,
            description: `Target store if explicitly mentioned: ${storeIds}. Otherwise null.`,
          },
        },
        required: ["product"],
      },
    },
  });

  if (!response.text) throw new Error("Gemini returned an empty response");
  const raw = JSON.parse(response.text) as { product?: unknown; maxPrice?: unknown; storePreference?: unknown };

  const product = typeof raw.product === "string" && raw.product.trim() ? raw.product.trim() : message.trim();
  const maxPrice = typeof raw.maxPrice === "number" && raw.maxPrice > 0 ? raw.maxPrice : null;
  const storePreference =
    typeof raw.storePreference === "string" ? (resolveRetailer(category, raw.storePreference)?.id ?? null) : null;

  return { product, maxPrice, storePreference };
}

const VERDICT_PROMPTS: Record<Category, { persona: string; goal: string; honesty: string; fallbackQuery: string; summaryDesc: string }> = {
  tech: {
    persona: `You are ChoiceBro, a legendary, tech-savvy Kiwi retail expert who loves finding massive bargains.
You are reviewing a list of live scraped retail prices for an item in New Zealand.`,
    goal: `Your goal is to write a highly conversational summary of the results using clean, witty, lighthearted New Zealand slang (words like: sweet-as, suss, bro, mate, champion, smash the button, crack on, sorted).`,
    honesty: `Be strictly honest. If one store is an absolute rip-off, call it out subtly. If a store has an epic deal because it includes extras, highlight that.`,
    fallbackQuery: "Tech Item",
    summaryDesc: "A 2-3 sentence overview of the price spread written in a legendary Kiwi tone.",
  },
  grocery: {
    persona: `You are ChoiceBro, a legendary, price-savvy Kiwi grocery expert who loves saving dollars on supermarket shops.
You are reviewing a list of live scraped supermarket prices for grocery items in New Zealand.`,
    goal: `Your goal is to write a highly conversational summary of the results using clean, witty, lighthearted New Zealand slang (words like: sweet-as, suss, bro, mate, champion, paknsave, woolworths, new world, massive rip-off, sorted).`,
    honesty: `Compare Woolworths, New World, and PAK'nSAVE. Be strictly honest. If one supermarket is way more expensive, call it out in a humorous Kiwi style.
Pack sizes differ between listings: where a unitPrice is provided, compare on that rather than the sticker price, and say so when a cheaper-looking item is actually worse value.`,
    fallbackQuery: "Grocery Item",
    summaryDesc: "A 2-3 sentence overview of the grocery price spread written in a legendary Kiwi tone.",
  },
};

export interface Verdict {
  summary: string;
  bestStore: string;
  dealRating: string;
  broAdvice: string;
}

export async function buildVerdict(category: Category, query: string | undefined, products: Partial<Product>[]): Promise<Verdict> {
  const ai = client();
  const p = VERDICT_PROMPTS[category];

  const listings = products.map((x) => ({
    store: x.site || "Unknown Store",
    title: x.title || "Listing",
    price: typeof x.price === "number" ? x.price : parseFloat(String(x.price)) || 0,
    ...(x.size ? { size: x.size } : {}),
    ...(x.unitPrice ? { unitPrice: `$${x.unitPrice.value.toFixed(2)} per ${x.unitPrice.per}` } : {}),
  }));

  const response = await ai.models.generateContent({
    model: VERDICT_MODEL,
    contents: `The user searched for: "${query || p.fallbackQuery}"
Here are the current live store listings found:
${JSON.stringify(listings)}

Give your expert breakdown following the exact JSON schema requested.`,
    config: {
      systemInstruction: `${p.persona}\n\n${p.goal}\n\n${p.honesty}`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING, description: p.summaryDesc },
          bestStore: { type: Type.STRING, description: "The short name of the specific store providing the absolute best value." },
          dealRating: { type: Type.STRING, description: 'A funny title rating out of 5, e.g., "5/5 Absolute Steal", "2/5 Standard As".' },
          broAdvice: { type: Type.STRING, description: "One punchy, direct piece of tactical buying advice." },
        },
        required: ["summary", "bestStore", "dealRating", "broAdvice"],
      },
    },
  });

  if (!response.text) throw new Error("Verdict text returned completely empty");
  return JSON.parse(response.text) as Verdict;
}
