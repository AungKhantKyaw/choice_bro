import { describe, expect, it, vi } from "vitest";
import { filterByKeywords } from "../filters";
import { resolveRetailer } from "../retailers";
import { Product } from "../types";
import { parsePrice } from "./price";
import { retry } from "./retry";
import { Semaphore } from "./semaphore";
import { withDeadline } from "./timeout";
import { parseSize, unitPriceFor } from "./units";

describe("parsePrice", () => {
  it.each([
    ["$1,299.00", 1299],
    ["$12.95", 12.95],
    ["549", 549],
    ["$8.19 each.", 8.19],
    ["", 0],
    ["call us", 0],
  ])("%s -> %d", (input, expected) => expect(parsePrice(input)).toBe(expected));
});

describe("parseSize / unitPriceFor", () => {
  it.each([
    ["Pams Butter Salted 500g", 500, "g"],
    ["Anchor Milk 2L", 2000, "ml"],
    ["Rice 1.5kg", 1500, "g"],
    ["Coke 6 x 375ml cans", 2250, "ml"],
    ["Juice 250ML", 250, "ml"],
  ])("%s", (title, amount, unit) => {
    const s = parseSize(title);
    expect(s?.amount).toBe(amount);
    expect(s?.unit).toBe(unit);
  });

  it("returns null when there is no weight/volume", () => {
    expect(parseSize("Bananas each")).toBeNull();
    expect(unitPriceFor(3, null)).toBeNull();
  });

  it("computes per-100 unit prices so pack sizes compare fairly", () => {
    expect(unitPriceFor(6.49, parseSize("Butter 500g"))).toEqual({ value: 1.3, per: "100g" });
    expect(unitPriceFor(4, parseSize("Milk 2L"))).toEqual({ value: 0.2, per: "100ml" });
  });

  it("does not mistake 'kg' for 'g'", () => {
    expect(parseSize("Flour 1kg")?.amount).toBe(1000);
  });
});

describe("withDeadline", () => {
  it("aborts the signal and rejects at the deadline", async () => {
    let seen: AbortSignal | undefined;
    await expect(
      withDeadline(20, (signal) => {
        seen = signal;
        return new Promise(() => {}); // never settles
      }),
    ).rejects.toThrow(/Timed out/);
    expect(seen?.aborted).toBe(true);
  });

  it("returns the value and clears its timer on success", async () => {
    vi.useFakeTimers();
    const p = withDeadline(1000, async () => "ok");
    await expect(p).resolves.toBe("ok");
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });
});

describe("retry", () => {
  it("retries then succeeds", async () => {
    let n = 0;
    const out = await retry(async () => {
      if (++n < 3) throw new Error("nope");
      return "done";
    }, 2);
    expect(out).toBe("done");
    expect(n).toBe(3);
  });

  it("stops retrying once aborted", async () => {
    const c = new AbortController();
    let n = 0;
    await expect(
      retry(
        async () => {
          n++;
          c.abort(new Error("deadline"));
          throw new Error("fail");
        },
        5,
        c.signal,
      ),
    ).rejects.toThrow();
    expect(n).toBe(1);
  });
});

describe("Semaphore", () => {
  it("never exceeds max concurrency and runs everything", async () => {
    const sem = new Semaphore(2);
    let active = 0;
    let peak = 0;
    const job = async () => {
      await sem.acquire();
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      sem.release();
    };
    await Promise.all(Array.from({ length: 8 }, job));
    expect(peak).toBe(2);
  });

  it("lets a waiter bail out on abort without leaking a slot", async () => {
    const sem = new Semaphore(1);
    await sem.acquire();
    const c = new AbortController();
    const waiting = sem.acquire(c.signal);
    c.abort(new Error("gave up"));
    await expect(waiting).rejects.toThrow("gave up");
    sem.release();
    await expect(sem.acquire()).resolves.toBeUndefined(); // slot is free again
  });
});

describe("resolveRetailer", () => {
  it.each([
    ["grocery", "PAK'nSAVE", "paknsave"],
    ["grocery", "pak n save", "paknsave"],
    ["grocery", "New World", "newworld"],
    ["tech", "JB Hi-Fi", "jbhifi"],
    ["tech", "pbtech", "pbtech"],
    ["tech", "Harvey", "harveynorman"],
  ] as const)("%s: %s -> %s", (cat, input, id) => expect(resolveRetailer(cat, input)?.id).toBe(id));

  it("returns null for retailers we don't scrape, or the wrong category", () => {
    expect(resolveRetailer("tech", "noelleeming")).toBeNull();
    expect(resolveRetailer("tech", "woolworths")).toBeNull();
    expect(resolveRetailer("grocery", null)).toBeNull();
  });
});

describe("filterByKeywords", () => {
  const p = (title: string): Product => ({ site: "x", title, price: 1, url: null, currency: "NZD" });
  const list = [p("Pams Butter Salted 500g"), p("Anchor Butter 500g"), p("Mainland Butter")];

  it("requires brand keywords but ignores generic words", () => {
    expect(filterByKeywords(list, "Pams Butter").map((x) => x.title)).toEqual(["Pams Butter Salted 500g"]);
  });

  it("keeps everything when the query is only generic words", () => {
    expect(filterByKeywords(list, "butter")).toHaveLength(3);
  });
});
