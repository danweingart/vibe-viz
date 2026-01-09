# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vibe-Viz is a data visualization dashboard for the Good Vibes Club NFT collection on Ethereum. It displays price history, sales analytics, holder distribution, and whale activity using data from OpenSea and CoinGecko APIs.

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run start    # Run production server
npm run lint     # ESLint
```

## Architecture

### Tech Stack
- Next.js 16 (App Router) + React 19 + TypeScript
- TanStack Query v5 for data fetching/caching
- Recharts for visualizations
- Tailwind CSS 4 with custom dark theme
- html-to-image for chart PNG exports

### Data Flow

```
External APIs → API Routes → Memory Cache → React Query → Components
```

**API Routes** (`src/app/api/`):
- `collection/stats` - Floor price, volume, holder count from OpenSea
- `events` - Recent sales with pagination
- `price-history` - Historical daily stats with premium calculations
- `eth-price` - Current ETH/USD from CoinGecko
- `refresh` - Cache invalidation endpoint

**Caching** (`src/lib/cache/memory.ts`):
- TTL-based in-memory cache sits between API routes and external APIs
- Collection stats: 5min, Events: 2min, Price history: 6hr, ETH price: 1min

**Hooks** (`src/hooks/`):
- `useCollectionStats`, `usePriceHistory`, `useRecentSales`, `useEthPrice`
- All use React Query with 5-minute auto-refresh

### Key Directories

- `src/components/charts/` - 8 chart components, each with download-to-PNG functionality
- `src/lib/opensea/client.ts` - OpenSea API v2 integration with retry logic and rate limiting
- `src/lib/coingecko/client.ts` - ETH price fetching
- `src/lib/utils.ts` - Formatting utilities (formatEth, formatUsd, formatPercent, etc.)
- `src/lib/constants.ts` - API endpoints, cache TTLs, chart color palette

### Brand Design

- Primary color: `#ffe048` (yellow)
- Fonts: Brice-Bold (headings), Mundial (body)
- Dark theme only with CSS variables in `globals.css`

### Chart Component Patterns

**Download/Export Structure**: Each chart uses `html-to-image` to export the chart as a PNG. The `chartRef` should only wrap the visual content intended for export. Interactive controls (toggles, filters, view switchers) must be placed **outside** the `chartRef` div so they don't appear in downloaded images.

```tsx
// CORRECT: Toggle outside chartRef
<Card>
  <CardHeader>...</CardHeader>

  {/* Interactive controls - excluded from download */}
  <div className="...">
    <ToggleButtons />
  </div>

  {/* Chart content - this gets captured */}
  <div ref={chartRef} className="p-4 bg-background-secondary rounded-lg">
    <ChartHeader />
    <ChartVisualization />
    <ChartLegend />
    <Watermark />
  </div>
</Card>
```

**Standard chart height**: 280px (`h-[280px]`) for consistency across all dashboard charts.

## Environment Variables

```
OPENSEA_API_KEY=your_key_here
```

Required for production. Without it, OpenSea API has strict rate limits.
