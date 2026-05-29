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

export default function Home() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState<SortOrder>("cheapest");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setProducts([]);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setProducts(data.products);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const lowestPrice = useMemo(() => {
    if (products.length === 0) return null;
    return Math.min(...products.map((p) => p.price));
  }, [products]);

  // Store breakdown for quick stats
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
    if (name.includes("pb tech") || name.includes("pbtech")) {
      return {
        border: "border-cyan-400 focus-within:ring-cyan-400",
        badgeBg: "bg-cyan-50 border-cyan-200",
        badgeText: "text-cyan-700",
        priceText: "text-emerald-600",
        btnBg:
          "bg-gradient-to-r from-cyan-500 to-emerald-400 text-white shadow-cyan-200 hover:brightness-105",
        shadow: "shadow-[0_8px_30px_rgb(34,211,238,0.25)]",
      };
    }
    if (name.includes("jb hi-fi") || name.includes("jbhifi")) {
      return {
        border: "border-yellow-400 focus-within:ring-yellow-400",
        badgeBg: "bg-yellow-100 border-yellow-300",
        badgeText: "text-yellow-800",
        priceText: "text-orange-600",
        btnBg:
          "bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-900 shadow-yellow-100 hover:brightness-105",
        shadow: "shadow-[0_8px_30px_rgb(234,179,8,0.25)]",
      };
    }
    if (name.includes("harvey norman") || name.includes("harvey")) {
      return {
        border: "border-red-500 focus-within:ring-red-400",
        badgeBg: "bg-red-50 border-red-200",
        badgeText: "text-red-700",
        priceText: "text-red-700",
        btnBg:
          "bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-red-200 hover:brightness-105",
        shadow: "shadow-[0_8px_30px_rgb(239,68,68,0.25)]",
      };
    }
    if (name.includes("eb games") || name.includes("ebgames")) {
      return {
        border: "border-indigo-500 focus-within:ring-indigo-400",
        badgeBg: "bg-indigo-50 border-indigo-200",
        badgeText: "text-indigo-700",
        priceText: "text-indigo-700",
        btnBg:
          "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-indigo-200 hover:brightness-105",
        shadow: "shadow-[0_8px_30px_rgb(99,102,241,0.25)]",
      };
    }
    return {
      border: "border-purple-400 focus-within:ring-purple-400",
      badgeBg: "bg-purple-50 border-purple-200",
      badgeText: "text-purple-700",
      priceText: "text-slate-900",
      btnBg:
        "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-purple-100 hover:brightness-105",
      shadow: "shadow-[0_8px_30px_rgb(168,85,247,0.25)]",
    };
  };

  // Simple skeleton loader while fetching
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
        <div className="inline-flex items-center gap-1.5 bg-white/80 backdrop-blur-sm border border-sky-200 text-sky-800 text-xs font-bold px-3 py-1 rounded-full mb-4 shadow-sm">
          <span>🇳🇿</span> Choice Prices, Instantly
        </div>

        <h1 className="text-5xl sm:text-6xl font-black tracking-tight mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.05)]">
          <span className="bg-gradient-to-r from-blue-600 via-sky-500 to-orange-500 bg-clip-text text-transparent">
            ChoiceBro
          </span>
          <span className="text-slate-700/30 font-light mx-2">|</span>
          <span className="bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-500 bg-clip-text text-transparent">
            NZ Price Compare
          </span>
        </h1>

        <p className="bg-gradient-to-r from-rose-400 via-fuchsia-500 to-purple-600 bg-clip-text text-transparent font-extrabold text-sm sm:text-base tracking-wide bg-rose-50/50 px-4 py-1.5 rounded-full inline-block border border-rose-100 shadow-sm">
          Suss out the cheapest deals instantly...
        </p>
      </header>

      {/* Search Input Section */}
      <div className="max-w-3xl mx-auto mb-14">
        <form
          onSubmit={handleSearch}
          className="relative flex items-center group bg-white p-2 rounded-2xl border-2 border-orange-400 shadow-[0_10px_25px_-5px_rgba(251,146,60,0.3)] transition-transform focus-within:scale-[1.01] focus-within:ring-2 focus-within:ring-orange-400 focus-within:ring-offset-2"
        >
          <div className="pl-3 pr-2 text-orange-400">
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
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What are we looking for? (e.g., Nintendo Switch, Air Fryer, iPad)"
            className="w-full py-3 bg-transparent font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none pr-24 sm:pr-36"
            disabled={loading}
            aria-label="Search products"
          />
          <div className="absolute right-2">
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-4 sm:px-6 py-3 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:brightness-110 text-white font-bold text-sm rounded-xl transition-all shadow-md active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none"
            >
              {loading ? "Sussing..." : "Find Deals"}
            </button>
          </div>
        </form>

        {loading && (
          <div className="flex items-center justify-center gap-3 mt-6 text-slate-600 font-semibold text-sm animate-pulse bg-white/60 py-2.5 px-4 rounded-xl border border-sky-100 w-max mx-auto shadow-sm">
            <svg
              className="animate-spin h-4 w-4 text-sky-600"
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
            <span>Scanning live web listings... Hang tight bro.</span>
          </div>
        )}

        {error && (
          <div className="mt-6 bg-red-100 border-2 border-red-400 text-red-800 px-4 py-3 rounded-xl font-bold text-sm text-center shadow-md">
            Ah, bugger: {error}
          </div>
        )}

        {!loading && products.length === 0 && query && !error && (
          <div className="mt-8 text-center py-10 bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-dashed border-sky-200 shadow-sm max-w-lg mx-auto">
            <p className="text-slate-600 font-bold">
              Nothing popped up for that term, bro.
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Try broadening your search parameter (e.g., &apos;Sony&apos;
              instead of exact serial codes).
            </p>
          </div>
        )}
      </div>

      {/* Main Results Container */}
      {products.length > 0 && (
        <div className="space-y-6">
          {/* Controls Bar Header with store breakdown */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-sky-200/60 shadow-sm">
            <div>
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600">
                The Lineup
              </h2>
              <p className="text-xs font-bold text-slate-400">
                Pulled {products.length} dynamic store variations.
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
                className={`px-3 py-2 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-1 ${sortBy === "store" ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              >
                Group By Store
              </button>
            </div>
          </div>

          {/* Skeleton loader while loading (if you keep products empty until done, but you have separate loading state) */}
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
              const isCheapest =
                lowestPrice !== null && product.price === lowestPrice;
              const storeTheme = getStoreTheme(product.site);

              return (
                <div
                  key={idx}
                  className={`group relative flex flex-col justify-between p-6 bg-white border-2 rounded-3xl transition-all duration-300 hover:-translate-y-1 ${storeTheme.border} ${storeTheme.shadow} ${
                    isCheapest ? "ring-4 ring-emerald-500/20" : ""
                  }`}
                >
                  {isCheapest && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 via-pink-500 via-orange-400 to-emerald-500 text-white font-black text-[11px] tracking-widest uppercase px-4 py-1 rounded-full shadow-lg border border-white animate-bounce-subtle">
                      Choice Deal
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

                    <h3 className="font-bold text-slate-800 line-clamp-3 text-sm sm:text-base group-hover:text-blue-600 transition-colors mb-4 min-h-[3rem]">
                      {product.title}
                    </h3>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                    <div className="text-center">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                        Live Market Price
                      </span>
                      <div
                        className={`text-3xl font-black tracking-tight ${storeTheme.priceText}`}
                      >
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

          <div className="bg-gradient-to-r from-amber-400/10 via-yellow-400/10 to-emerald-400/10 border-2 border-amber-400 rounded-2xl p-5 mt-10 shadow-sm flex flex-col sm:flex-row items-center gap-4">
            <div className="bg-amber-400 text-slate-900 p-3 rounded-xl shadow-inner text-xl font-bold">
              🤙
            </div>
            <div className="text-center sm:text-left">
              <h4 className="text-sm font-black text-amber-950 uppercase tracking-wide">
                Just a heads up, bro!
              </h4>
              <p className="text-xs text-amber-900 font-medium mt-0.5 leading-relaxed">
                ChoiceBro is just a fun weekend project built for the love of it
                (I don&apos;t make a single cent off this!). Because the retail
                sites update their prices constantly, things might vary slightly
                by the time you click through. Always double-check the final
                total on the store&apos;s actual site before checking out!
              </p>
            </div>
          </div>

          <footer className="text-center text-[11px] font-semibold text-slate-400/80 pt-4">
            * Built purely for fun and finding bargains. No corporate ties, no
            hidden agendas, just choice deals.
          </footer>
        </div>
      )}
    </main>
  );
}
