/** Parses the first money-looking number in `text`: "$1,299.00" -> 1299. Returns 0 if none. */
export function parsePrice(text: string | null | undefined): number {
  const match = (text ?? "").match(/\$?\s*([\d,]+(?:\.\d+)?)/);
  if (!match) return 0;
  const n = parseFloat(match[1].replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Resolves `href` against `base`. Handles relative, protocol-relative and absolute URLs. */
export function absUrl(href: string | null | undefined, base: string): string {
  if (!href) return "";
  try {
    return new URL(href, base).toString();
  } catch {
    return "";
  }
}
