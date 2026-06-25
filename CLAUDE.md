# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- Install dependencies: `npm install`
- Start development server: `npm run dev` (runs at http://localhost:3000)
- Build for production: `npm run build`
- Start production server: `npm run start`
- Lint code: `npm run lint`
- Note: There are no test scripts currently configured. Testing is manual via the UI.

## Codebase Structure

- **app/**: Next.js 13+ App Router components.
  - `app/page.tsx`: Main UI with search form and results display.
  - `app/grocery/page.tsx`: Grocery-specific search interface.
  - `app/api/search/route.ts`: API endpoint that orchestrates scrapers and returns product data.
  - `app/api/chat/route.ts`: AI endpoint for parsing natural language queries (using Google GenAI).
  - `app/api/verdict/route.ts`: AI endpoint for generating deal verdicts.
  - `app/layout.tsx`: Root layout with metadata and background styles.
  - `app/globals.css`: Tailwind CSS base styles and custom animations.
- **lib/**: Utility modules and shared logic.
  - `lib/orchestrator.ts`: Runs all retailer scrapers concurrently and aggregates results.
  - `lib/groceryOrchestrator.ts`: Specialized orchestrator for grocery retailers.
  - `lib/browser.ts`: Puppeteer browser launcher pool.
  - `lib/cache.ts`: Cache utilities.
  - `lib/types.ts`: Shared TypeScript interfaces (Product, ScraperResult).
  - `lib/scrapers/`: Individual scraper implementations.
    - `pbtech.ts`, `harveyNorman.ts`, `jbhifi.ts`: Tech retailers (JB Hi-Fi uses Puppeteer).
    - `newworld.ts`, `paknsave.ts`, `woolworths.ts`: Grocery retailers.
  - `lib/utils/`: Helper utilities.
    - `fileCache.ts`: Persistent file cache engine with 4-hour TTL.
    - `scraper-helpers.ts`: Stealth, request interception, and mock browser profiles.
    - `retry.ts`, `timeout.ts`: Resilience utilities.
- **public/**: Static assets.
- **.cache/**: Persistent JSON query cache directory (auto-created).
- **Configuration**: `next.config.ts`, `tailwind.config.js`, `tsconfig.json`, `.env.local`.

## Key Features

- Real-time price comparison across tech and grocery retailers.
- AI-powered query parsing using Gemini to extract product name, max price, and store preferences.
- Intelligent scraper routing - only runs scrapers for specified stores (3x faster).
- Segmented persistent caching with file-based JSON cache (4-hour TTL).
- Advanced scraper stealth using User-Agent rotation, webdriver evasion, and request interception.
- Store-specific theming in UI components.

## Important: Next.js 16 Breaking Changes

This is a Next.js 16 preview build with breaking changes. Check `node_modules/next/dist/docs/` before modifying code. See `AGENTS.md` for details.

## Notes for Development

- Puppeteer requires a Chromium executable; ensure it's installed when running scrapers locally.
- The AI features depend on the Google GenAI API; set `GEMINI_API_KEY` in `.env.local`.
- When modifying scrapers, consider that retailer websites may change; selectors may need updating.
- The project uses TypeScript strictly with modern Next.js features (server actions, route handlers).
- `.claude/settings.local.json` allows `npm run *` commands without prompts.
