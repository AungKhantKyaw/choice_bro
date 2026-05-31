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
  - `app/api/search/route.ts`: API endpoint that orchestrates scrapers and returns product data.
  - `app/api/chat/route.ts`: AI endpoint for parsing natural language queries (using Google GenAI).
  - `app/api/verdict/route.ts`: AI endpoint for generating deal verdicts (if exists; we saw verdict used in page.tsx).
  - `app/layout.tsx`: Root layout with metadata and background styles.
  - `app/globals.css`: Tailwind CSS base styles and custom animations.
- **lib/**: Utility modules and shared logic.
  - `lib/orchestrator.ts`: Runs all retailer scrapers concurrently and aggregates results.
  - `lib/scrapers/`: Individual scraper implementations for each retailer.
    - `pbtech.ts`: PB Tech scraper (likely using fetch and parsing).
    - `harveyNorman.ts`: Harvey Norman scraper.
    - `jbhifi.ts`: JB Hi-Fi scraper (uses Puppeteer for dynamic content).
  - `lib/types.ts`: Shared TypeScript interfaces (e.g., Product, StoreTheme).
- **public/**: Static assets (e.g., screenshot.png).
- **Configuration**: 
  - `next.config.ts`: Next.js configuration.
  - `tailwind.config.js`: Tailwind CSS configuration.
  - `tsconfig.json`: TypeScript configuration.
  - `.env.local`: Environment variables (e.g., API keys for Google GenAI).

## Key Features

- Real-time price comparison across PB Tech, Harvey Norman, and JB Hi-Fi.
- AI-powered query parsing to extract product name and optional max price.
- Store-specific theming in UI components.
- Responsive design with Tailwind CSS.
- Verdict feature that provides AI-generated deal advice.

## Notes for Development

- Puppeteer requires a Chromium executable; ensure it's installed when running scrapers locally.
- The AI features depend on the Google Generative AI API; an API key must be set in `.env.local`.
- When modifying scrapers, consider that retailer websites may change; selectors may need updating.
- The project uses modern Next.js features (server actions, route handlers) and TypeScript strictly.