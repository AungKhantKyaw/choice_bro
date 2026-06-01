# ChoiceBro | NZ Price Compare

> Suss out the absolute cheapest tech and appliances across PB Tech, JB Hi-Fi, Harvey Norman, and more – instantly.

![NZ Price Compare Screenshot](screenshot.png)

## Overview

ChoiceBro is an intelligent, real-time price comparison tool designed specifically for New Zealand shoppers. Enter any shopping query, and ChoiceBro leverages AI to extract your budget, product name, and store preferences, scrapes live listings concurrently from local retailers, and presents them in a sleek, Kiwi-flavoured dashboard. 

## Key Features

- **AI-Parsed Queries** – Type like a human, shop like a pro. Gemini dynamically parses casual searches (e.g. *"find a mechanical keyboard under $150 at JB Hi-Fi"*) into structured queries.
- **Intelligent Scraper Routing** – If a user specifies a target store (e.g. *"at PB Tech"*), ChoiceBro dynamically routes queries and **only** executes browser scrapers for that specific retailer, speeding up retrieval times by **3x**.
- **Segmented Persistent Caching** – Repeat searches load instantly (<50ms) using a local, file-based JSON cache segmented by query and store preference (with a 4-hour TTL).
- **Advanced Scraper Stealth & Evasion** – Scrapers bypass bot detection and Cloudflare checkblocks using User-Agent rotation, webdriver evasion (`navigator.webdriver` removal), mock desktop browser footprints (mocked plugins and languages), and custom HTTP headers.
- **Ultra-Fast Interception** – Puppeteer blocks heavy telemetry, ads, analytic pixels (GTM, Facebook/TikTok pixels, Sentry), images, styles, and font files to fetch pricing data in seconds.
- **Responsive Store-Specific Theming** – Retail listings are styled dynamically matching each brand's signature identity (e.g., cyan/emerald for PB Tech, yellow/amber for JB Hi-Fi).
- **UX Polish** – Supports direct click-to-search query suggestions and resilient empty-state rendering that hides no-results alerts until searches actively finish.

## Installation

### Prerequisites
- Node.js 18+ and npm/yarn/pnpm
- A hosting environment that supports Puppeteer (not Vercel Serverless out-of-the-box without custom Chromium layers)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/AungKhantKyaw/choice_bro.git

cd choice_bro

# 2. Install dependencies
npm install

# 3. Create .env.local and add your API Key
echo "GEMINI_API_KEY=your_gemini_api_key_here" > .env.local

# 4. Run the development server
npm run dev

# 5. Open http://localhost:3000
```

## Project Structure

```text
choice_bro/
├── app/
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.ts          # AI query extractor
│   │   ├── search/
│   │   │   └── route.ts          # Orchestrated scraper router
│   │   └── verdict/
│   │       └── route.ts          # Bro's AI Deal Review generator
│   ├── layout.tsx                # Root layout with metadata and styling
│   ├── page.tsx                  # Main client-side Search Dashboard
│   └── globals.css               # Tailwind + custom animations
├── lib/
│   ├── scrapers/
│   │   ├── pbtech.ts             # PB Tech scraper
│   │   ├── harveyNorman.ts       # Harvey Norman scraper
│   │   └── jbhifi.ts             # JB Hi-Fi scraper (Puppeteer)
│   ├── utils/
│   │   ├── fileCache.ts          # Persistent file cache engine [NEW]
│   │   ├── retry.ts              # Action retries handler
│   │   ├── scraper-helpers.ts    # Stealth, request interception & mock profiles [UPDATED]
│   │   └── timeout.ts            # Timeout wrapper
│   ├── browser.ts                # Puppeteer browser launcher pool
│   ├── orchestrator.ts           # Dynamic scraper coordinator [UPDATED]
│   └── types.ts                  # TypeScript interfaces
├── .cache/                       # Persistent JSON query cache directory (auto-created)
├── public/                       # Static public assets
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── README.md
```

## Just a heads up, bro! (Disclaimer)

ChoiceBro is an entirely non-commercial, free project built for the love of coding and bargain hunting. I don't earn a single cent off this application!

Because retail platforms update inventories and clear items dynamically, prices found here may vary slightly from real-time checkout displays on merchant domains. Users are always encouraged to double-check final values natively at checkout.

## License

This project is open-source and free to play around with. Fork it, tweak it, add your favorite local store, and happy hunting!
