import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChoiceBro | NZ Price Compare",
  description:
    "Suss out the absolute cheapest tech and appliances across PB Tech, JB Hi-Fi, Harvey Norman, and more instantly.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="bg-[#e0f2fe] font-sans antialiased min-h-screen relative overflow-x-hidden">        
        <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(#bae6fd_1px,transparent_1px)] [background-size:16px_16px]" />
        
        {/* Choice Navigation Header */}
        <header className="max-w-6xl mx-auto px-4 pt-8 sm:px-6 z-20 relative">
          <nav className="flex items-center justify-center gap-6 bg-white/75 backdrop-blur-md py-3 px-8 rounded-2xl border border-sky-200/50 shadow-md w-fit mx-auto transition-transform hover:scale-[1.01]">
            <a 
              href="/" 
              className="flex items-center gap-2 text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700 hover:text-blue-600 transition-all active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              Tech Deals
            </a>
            <span className="text-slate-200 font-light">|</span>
            <a 
              href="/grocery" 
              className="flex items-center gap-2 text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700 hover:text-emerald-600 transition-all active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M12 2v3M12 5c-3.3 0-6 2.7-6 6 0 4 3.5 7 6 9 2.5-2 6-5 6-9 0-3.3-2.7-6-6-6z" />
                <path d="M9 10c0-1.7 1.3-3 3-3" />
              </svg>
              Grocery Shop
            </a>
          </nav>
        </header>

        {children}
      </body>
    </html>
  );
}
