# Infra Portfolio — Mode 1 (Price Check)

Mobile-first dashboard showing live prices, 52-week range bars, and buy-zone
status for the 10 holdings defined in `src/config/portfolio.js`.

## Local dev

```
npm install
npm install -g netlify-cli   # if not already installed
netlify dev
```

`netlify dev` runs Vite + the `/api/prices` serverless function together,
reading `FINNHUB_API_KEY` from `.env` (already set locally, gitignored).

Plain `npm run dev` will run the UI but `/api/prices` will 404 since the
Finnhub function won't be served.

## Deploy to Netlify

1. Push this repo to GitHub.
2. In Netlify: "Add new site" → import the repo. Build command `npm run build`,
   publish directory `dist` (already set in `netlify.toml`).
3. Site settings → Environment variables → add `FINNHUB_API_KEY` with your key.
4. Deploy. Open the site URL on your phone and "Add to Home Screen".

## What's here (Mode 1 only)

- `src/config/portfolio.js` — holdings, buy zones, FX rate. Edit as the thesis evolves.
- `netlify/functions/prices.js` — server-side Finnhub proxy (keeps the API key off the client).
- `src/components/HoldingCard.jsx` — per-holding card with zone color, range bar, badge.

Modes 2 (Buy allocation engine) and 3 (Thesis Review LLM call) are not built yet.
