import { UnitPrice } from "../types";

export interface ParsedSize {
  /** Total amount in grams or millilitres. */
  amount: number;
  unit: "g" | "ml";
  /** Human label, e.g. "500g" or "6 x 375ml". */
  label: string;
}

const MULTI = /(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\b/i;
const SINGLE = /(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\b/i;

function toBase(value: number, unit: string): { amount: number; unit: "g" | "ml" } {
  switch (unit.toLowerCase()) {
    case "kg":
      return { amount: value * 1000, unit: "g" };
    case "l":
      return { amount: value * 1000, unit: "ml" };
    case "ml":
      return { amount: value, unit: "ml" };
    default:
      return { amount: value, unit: "g" };
  }
}

/** Best-effort size parse from a product title. Returns null when no weight/volume is found. */
export function parseSize(title: string): ParsedSize | null {
  const multi = title.match(MULTI);
  if (multi) {
    const count = parseInt(multi[1], 10);
    const each = toBase(parseFloat(multi[2]), multi[3]);
    return {
      amount: count * each.amount,
      unit: each.unit,
      label: `${count} x ${multi[2]}${multi[3].toLowerCase()}`,
    };
  }

  const single = title.match(SINGLE);
  if (single) {
    const base = toBase(parseFloat(single[1]), single[2]);
    return { ...base, label: `${single[1]}${single[2].toLowerCase()}` };
  }

  return null;
}

export function unitPriceFor(price: number, size: ParsedSize | null): UnitPrice | null {
  if (!size || size.amount <= 0 || price <= 0) return null;
  return {
    value: Math.round((price / size.amount) * 100 * 100) / 100,
    per: size.unit === "g" ? "100g" : "100ml",
  };
}
