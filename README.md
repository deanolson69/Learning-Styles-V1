# PEI Planner

A mobile-first React + Vite + TypeScript + Tailwind app for planning a 1-week Prince Edward Island group trip.

## Features
- Family + member setup with per-family AM/PM availability by day.
- Preloaded editable PEI activity inventory (Anne of Green Gables, food, tourism, niche).
- 0-5 ratings per member with completion tracking and filters.
- Recommendation engine for:
  - Best all-together activities
  - Better separate-family activities
  - Two-family subgroup suggestions
- Half-day trip logic:
  - Arrival day: PM-only
  - Departure day: AM-only
- 7+ day schedule grid (start-to-end inclusive), respecting disabled slots.
- Export:
  - Copyable summary text
  - JSON download + JSON import (includes slot availability)
  - CSV download for activity scoring
- Local persistence in `localStorage` with a versioned schema and safe fallback migration.

## Run
```bash
npm install
npm run dev
```

Then open the local URL shown by Vite (typically `http://localhost:5173`).

## Build
```bash
npm run build
npm run preview
```

## Notes
- No backend, no login, no external services required.
- Designed for local use on one device; merge data using JSON export/import.
