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
        {children}
      </body>
    </html>
  );
}
