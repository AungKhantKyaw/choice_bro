"use client";

import { useState, useMemo } from "react";

interface Product {
  site: string;
  title: string;
  price: number;
  url: string;
  currency: string;
}

type SortOrder = "cheapest" | "store";

interface StoreTheme {
  border: string;
  badgeBg: string;
  badgeText: string;
  priceText: string;
  btnBg: string;
  shadow: string;
}

export default function GroceryPage() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState<SortOrder>("cheapest");
  const [verdict, setVerdict] = useState<{ summary: string; bestStore: string; dealRating: string; broAdvice: string } | null>(null);
  const [loadingVerdict, setLoadingVerdict] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const activeQuery = customQuery !== undefined ? customQuery : query;
    if (!activeQuery.trim()) return;

    setLoading(true);
    setError("");
    setProducts([]);
    setVerdict(null);
    setHasSearched(false);

    try {
      // 1. Process search query through AI Grocery Chat Parser
      const aiRes = await fetch("/api/grocery/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: activeQuery.trim() }),
      });
      if (!aiRes.ok) throw new Error("AI parsing failed");
      const searchConfig = await aiRes.json();

      // 2. Perform live search scraping
      const res = await fetch("/api/grocery/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchConfig.product,
          storePreference: searchConfig.storePreference,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");

      let finalProducts = data.products;

      // Filter by AI maxPrice if provided
      if (searchConfig.maxPrice) {
        finalProducts = finalProducts.filter((p: Product) => p.price <= searchConfig.maxPrice);
      }

      // Filter by store preference on client side as fallback
      if (searchConfig.storePreference) {
        const pref = searchConfig.storePreference.toLowerCase();
        finalProducts = finalProducts.filter((p: Product) => {
          const site = p.site.toLowerCase();
          if (pref === "woolworths" && site.includes("woolworths")) return true;
          if (
            (pref === "paknsave" || pref === "pak n save" || pref === "pak'nsave") &&
            site.includes("pak")
          )
            return true;
          if (
            (pref === "newworld" || pref === "new world") &&
            site.includes("new world")
          )
            return true;
          return false;
        });
      }

      setProducts(finalProducts);
      setHasSearched(true);

      // 3. Request AI Grocery Verdict if products were found
      if (finalProducts.length > 0) {
        setLoadingVerdict(true);
        fetch("/api/grocery/verdict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ products: finalProducts, query: searchConfig.product }),
        })
          .then((vRes) => vRes.json())
          .then((vData) => {
            if (!vData.error) {
              setVerdict(vData);
            } else {
              console.error("Verdict error:", vData.error);
            }
          })
          .catch((err) => {
            console.error("Verdict fetch failed:", err);
          })
          .finally(() => setLoadingVerdict(false));
      }
    } catch (err) {
      const errorObj = err as Error;
      setError(errorObj.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const lowestPrice = useMemo(() => {
    if (products.length === 0) return null;
    return Math.min(...products.map((p) => p.price));
  }, [products]);

  const storeBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    products.forEach((p) => {
      breakdown[p.site] = (breakdown[p.site] || 0) + 1;
    });
    return breakdown;
  }, [products]);

  const sortedProducts = useMemo(() => {
    const list = [...products];
    if (sortBy === "cheapest") {
      return list.sort((a, b) => a.price - b.price);
    }
    return list.sort((a, b) => a.site.localeCompare(b.site));
  }, [products, sortBy]);

  const getStoreTheme = (site: string): StoreTheme => {
    const name = site.toLowerCase();
    if (name.includes("paknsave") || name.includes("pak'nsave") || name.includes("pak")) {
      return {
        border: "border-yellow-400 focus-within:ring-yellow-400",
        badgeBg: "bg-yellow-100 border-yellow-300",
        badgeText: "text-yellow-800",
        priceText: "text-slate-900",
        btnBg: "bg-gradient-to-r from-yellow-400 to-yellow-500 text-slate-900 shadow-yellow-100 hover:brightness-105",
        shadow: "shadow-[0_8px_30px_rgb(234,179,8,0.2)]",
      };
    }
    if (name.includes("woolworths")) {
      return {
        border: "border-emerald-600 focus-within:ring-emerald-600",
        badgeBg: "bg-emerald-50 border-emerald-200",
        badgeText: "text-emerald-800",
        priceText: "text-emerald-700",
        btnBg: "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-100 hover:brightness-105",
        shadow: "shadow-[0_8px_30px_rgb(5,150,105,0.2)]",
      };
    }
    if (name.includes("new world") || name.includes("newworld")) {
      return {
        border: "border-red-600 focus-within:ring-red-600",
        badgeBg: "bg-red-50 border-red-200",
        badgeText: "text-red-700",
        priceText: "text-red-600",
        btnBg: "bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-red-100 hover:brightness-105",
        shadow: "shadow-[0_8px_30px_rgb(220,38,38,0.2)]",
      };
    }
    return {
      border: "border-purple-400 focus-within:ring-purple-400",
      badgeBg: "bg-purple-50 border-purple-200",
      badgeText: "text-purple-700",
      priceText: "text-slate-900",
      btnBg: "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-purple-100 hover:brightness-105",
      shadow: "shadow-[0_8px_30px_rgb(168,85,247,0.2)]",
    };
  };

  const SkeletonCard = () => (
    <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 animate-pulse">
      <div className="h-6 w-24 bg-slate-200 rounded-full mb-4"></div>
      <div className="h-12 bg-slate-200 rounded-lg mb-4"></div>
      <div className="h-10 bg-slate-200 rounded-xl w-3/4 mx-auto mb-3"></div>
      <div className="h-12 bg-slate-200 rounded-xl"></div>
    </div>
  );

  return (
    <main className="relative max-w-6xl mx-auto px-4 py-12 sm:px-6 z-10">
      {/* Brand Header */}
      <header className="text-center mb-10">
        <div className="inline-flex items-center gap-1.5 bg-white/80 backdrop-blur-sm border border-emerald-200 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-full mb-4 shadow-sm">
          <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
          Kiwi Grocery Deals, Sorted
        </div>

        <h1 className="text-5xl sm:text-6xl font-black tracking-tight mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.05)]">
          <span className="bg-gradient-to-r from-emerald-600 via-yellow-500 to-red-500 bg-clip-text text-transparent">
            ChoiceBro
          </span>
          <span className="text-slate-700/30 font-light mx-2">|</span>
          <span className="bg-gradient-to-r from-teal-600 via-emerald-500 to-amber-500 bg-clip-text text-transparent">
            NZ Grocery Compare
          </span>
        </h1>

        <p className="bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 bg-clip-text text-transparent font-extrabold text-sm sm:text-base tracking-wide bg-emerald-50/50 px-4 py-1.5 rounded-full inline-block border border-emerald-100 shadow-sm">
          Avoid the Woolworths tax, bro. Suss out PAK&apos;nSAVE, Woolworths, and New World prices!
        </p>
      </header>

      {/* Search Input Section */}
      <div className="max-w-3xl mx-auto mb-14">
        <form
          onSubmit={handleSearch}
          className="relative flex items-center group bg-white p-2 rounded-2xl border-2 border-emerald-500 shadow-[0_10px_25px_-5px_rgba(16,185,129,0.25)] transition-transform focus-within:scale-[1.01] focus-within:ring-2 focus-within:ring-emerald-400 focus-within:ring-offset-2"
        >
          <div className="pl-3 pr-2 text-emerald-500">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHasSearched(false);
            }}
            placeholder="Try: 'cheapest Milo powder' or 'Find out butter deals at PAKnSAVE'..."
            className="w-full py-3 bg-transparent font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none pr-24 sm:pr-36"
            disabled={loading}
            aria-label="Search groceries"
          />
          <div className="absolute right-2">
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-4 sm:px-6 py-3 bg-gradient-to-r from-emerald-500 via-teal-600 to-indigo-600 hover:brightness-110 text-white font-bold text-sm rounded-xl transition-all shadow-md active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none"
            >
              {loading ? "Sussing..." : "Compare Prices"}
            </button>
          </div>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Quick searches:</span>

          {[
            "Find Milo powder",
            "Pams Butter deals",
            "Fresh milk under $5 bucks"
          ].map((suggestion, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setQuery(suggestion);
                handleSearch(undefined, suggestion);
              }}
              className="text-xs bg-slate-100 hover:bg-emerald-100 hover:text-emerald-950 border border-slate-200 hover:border-emerald-300 text-slate-600 font-medium px-3 py-1.5 rounded-xl transition-all duration-200 active:scale-95"
            >
              &quot;{suggestion}&quot;
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-3 mt-6 text-slate-600 font-semibold text-sm animate-pulse bg-white/60 py-2.5 px-4 rounded-xl border border-emerald-100 w-max mx-auto shadow-sm">
            <svg
              className="animate-spin h-4 w-4 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Scanning Kiwi supermarkets... Hang tight bro.</span>
          </div>
        )}

        {error && (
          <div className="mt-6 bg-red-100 border-2 border-red-400 text-red-800 px-4 py-3 rounded-xl font-bold text-sm text-center shadow-md">
            Ah, bugger: {error}
          </div>
        )}

        {!loading && products.length === 0 && hasSearched && !error && (
          <div className="mt-8 text-center py-10 bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-dashed border-emerald-200 shadow-sm max-w-lg mx-auto">
            <p className="text-slate-600 font-bold">
              Nothing popped up for that grocery item, bro.
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Try a simpler search term (e.g. &apos;Milo&apos; or &apos;butter&apos;).
            </p>
          </div>
        )}
      </div>

      {/* DYNAMIC AI BRO'S VERDICT BOX MODULE */}
      {(loadingVerdict || verdict) && (
        <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-white rounded-3xl p-6 border border-emerald-500/30 shadow-xl transition-all duration-300 mb-8 max-w-4xl mx-auto">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3 mb-4">
            <div className="flex items-center gap-2.5">
              <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M12 2v3M12 5c-3.3 0-6 2.7-6 6 0 4 3.5 7 6 9 2.5-2 6-5 6-9 0-3.3-2.7-6-6-6z" />
                <path d="M9 10c0-1.7 1.3-3 3-3" />
              </svg>
              <div>
                <h3 className="font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-yellow-300 text-sm sm:text-base">
                  BRO&apos;S GROCERY VERDICT
                </h3>
                <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-widest">NZ Supermarket Review</p>
              </div>
            </div>

            {verdict && (
              <span className="bg-emerald-500/20 border border-emerald-400/30 text-yellow-300 font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider">
                Score: {verdict.dealRating}
              </span>
            )}
          </div>

          {loadingVerdict ? (
            <div className="flex items-center gap-3 text-slate-300 py-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce [animation-delay:0.4s]" />
              <p className="text-xs font-semibold text-emerald-200/80 italic">Bro is calculating standard vs club card savings...</p>
            </div>
          ) : (
            verdict && (
              <div className="space-y-3.5">
                <p className="text-sm text-slate-200 leading-relaxed font-medium">
                  &quot;{verdict.summary}&quot;
                </p>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="block text-[10px] text-emerald-300 font-bold uppercase tracking-wider">Lowest Price Target</span>
                    <span className="flex items-center gap-1 text-xs font-black text-white bg-emerald-700/50 px-2.5 py-1 rounded-md border border-emerald-400/30 mt-0.5 w-fit uppercase">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                      {verdict.bestStore}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-yellow-400 font-bold uppercase tracking-wider sm:text-right">Bargain Advice</span>
                    <p className="flex sm:justify-end items-center gap-1.5 text-xs font-black text-yellow-300 italic mt-0.5">
                      <svg className="w-3.5 h-3.5 text-yellow-300 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      {verdict.broAdvice}
                    </p>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Main Results Container */}
      {products.length > 0 && (
        <div className="space-y-6">
          {/* Controls Bar Header with store breakdown */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-emerald-200/60 shadow-sm">
            <div>
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-500 to-indigo-600">
                Supermarket Lineup
              </h2>
              <p className="text-xs font-bold text-slate-400">
                Pulled {products.length} store variations.
                {Object.entries(storeBreakdown).map(([store, count]) => (
                  <span key={store} className="ml-2 inline-block">
                    {store}: {count}
                  </span>
                ))}
              </p>
            </div>
            <div
              className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200"
              role="group"
              aria-label="Sort options"
            >
              <span className="text-slate-400 px-2 uppercase tracking-wider text-[10px]">
                Sort By
              </span>
              <button
                type="button"
                onClick={() => setSortBy("cheapest")}
                aria-pressed={sortBy === "cheapest"}
                className={`px-3 py-2 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1 ${sortBy === "cheapest" ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              >
                Cheapest First
              </button>
              <button
                type="button"
                onClick={() => setSortBy("store")}
                aria-pressed={sortBy === "store"}
                className={`px-3 py-2 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1 ${sortBy === "store" ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              >
                Group By Store
              </button>
            </div>
          </div>

          {/* Skeleton loader while loading */}
          {loading && (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* Dynamic Grid Matrix Output */}
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {sortedProducts.map((product, idx) => {
              const isCheapest = lowestPrice !== null && product.price === lowestPrice;
              const storeTheme = getStoreTheme(product.site);

              return (
                <div
                  key={idx}
                  className={`group relative flex flex-col justify-between p-6 bg-white border-2 rounded-3xl transition-all duration-300 hover:-translate-y-1 ${storeTheme.border} ${storeTheme.shadow} ${
                    isCheapest ? "ring-4 ring-emerald-500/20" : ""
                  }`}
                >
                  {isCheapest && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-600 via-yellow-400 to-red-500 text-white font-black text-[11px] tracking-widest uppercase px-4 py-1 rounded-full shadow-lg border border-white animate-bounce-subtle">
                      Cheapest Deal
                    </span>
                  )}

                  <div>
                    <div className="mb-4 mt-1 flex justify-between items-start">
                      <span
                        className={`inline-block text-[11px] font-black tracking-widest uppercase px-2.5 py-1 rounded-lg border ${storeTheme.badgeBg} ${storeTheme.badgeText}`}
                      >
                        {product.site}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-800 line-clamp-3 text-sm sm:text-base group-hover:text-emerald-600 transition-colors mb-4 min-h-[3rem]">
                      {product.title}
                    </h3>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                    <div className="text-center">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                        Supermarket Price
                      </span>
                      <div className={`text-3xl font-black tracking-tight ${storeTheme.priceText}`}>
                        $
                        {product.price.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                        <span className="text-sm font-black text-slate-400 ml-1">
                          {product.currency || "NZD"}
                        </span>
                      </div>
                    </div>

                    {product.url && (
                      <a
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md ${storeTheme.btnBg} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current`}
                      >
                        Go to Store
                        <svg
                          className="w-3.5 h-3.5 transform transition-transform group-hover:translate-x-1"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                          />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-gradient-to-r from-emerald-400/10 via-yellow-400/10 to-emerald-400/10 border-2 border-emerald-400 rounded-2xl p-5 mt-10 shadow-sm flex flex-col sm:flex-row items-center gap-4">
            <div className="bg-emerald-400 text-slate-900 p-3 rounded-xl shadow-inner">
              <svg className="w-6 h-6 text-slate-900" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <div className="text-center sm:text-left">
              <h4 className="text-sm font-black text-emerald-950 uppercase tracking-wide">
                Just a heads up, bro!
              </h4>
              <p className="text-xs text-emerald-900 font-medium mt-0.5 leading-relaxed">
                Supermarket pricing varies by location and active club memberships. Always double check prices on the active supermarket page before heading in-store.
              </p>
            </div>
          </div>

          <footer className="text-center text-[11px] font-semibold text-slate-400/80 pt-4">
            * Built purely for fun and saving dollars. No corporate ties, no hidden agendas.
          </footer>
        </div>
      )}
    </main>
  );
}
