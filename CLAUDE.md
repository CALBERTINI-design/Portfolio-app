# CLAUDE.md — Infrastructure Portfolio App

This file is the build spec and standing context for an internal personal-use
web app. Read it fully before writing code. The owner is a long-term retail
investor running a "picks and shovels" infrastructure thesis in a Canadian TFSA.
This app replaces a manual chat-based workflow.

---

## 1. What this app is

A personal, internal-only web app (not native iOS, not App Store) that the
owner adds to their phone Home Screen. It works whenever there is phone service
or WiFi — no offline requirement. Host on Vercel or Netlify free tier.

Single user. No auth needed beyond a basic gate if convenient. Mobile-first
layout (phone screen is the primary surface), but should also look right on
desktop.

The app exists to answer three different questions at three different rhythms,
so it is built as three explicit modes, each manually triggered. Nothing
runs on a schedule. Nothing calls a paid API in the background.

---

## 2. The portfolio (10 holdings, 6 thesis layers)

Core thesis: own the infrastructure backbone of AI, electrification, and
automation — power, grid, cooling, networking, robotics, compute — rather than
betting on which AI software company wins. 10-year horizon. Strong 3-5 year
hold minimum before any selling or position changes. Accumulation phase, not
trading. No trimming/rotating inside that window unless a genuine thesis break.

| Layer | Ticker | Company | Tier |
|---|---|---|---|
| Power & Energy | ETN | Eaton | core |
| Power & Energy | CEG | Constellation Energy | core |
| Grid & Infrastructure | PWR | Quanta Services | core |
| Grid & Infrastructure | MTZ | MasTec | core |
| Digital Infrastructure | VRT | Vertiv | core |
| Digital Infrastructure | ANET | Arista Networks | core |
| Robotics & Automation | SYM | Symbotic | core |
| Robotics & Automation | TER | Teradyne | core |
| AI Compute | CBRS | Cerebras | speculative |
| Quantum | IONQ | IonQ | speculative |

Watchlist (not held yet): RGTI, QBTS, MRVL (wait for ~$200-220).

All tickers trade on US exchanges. Owner buys from CAD via CIBC Investor Edge,
whole shares only (no fractional). Use configurable FX rate, default 1 USD =
1.36 CAD.

Contributions: $400 CAD biweekly through end of 2026 only. Starting 2027,
contributions increase substantially (business income + house sale proceeds).
Larger lump sums expected for full position sizing.

---

## 3. Target buy zones (USD)

Store as editable config so they can be updated.

| Ticker | Aggressive buy ≤ | Safe entry ≤ | Notes |
|---|---|---|---|
| ETN | $290 | $340 | don't chase above ~$345 |
| CEG | $280 | $340 | best value when in agg zone |
| PWR | $510 | $590 | SKIP until <$590 — too rich + >1 contribution/share |
| MTZ | $310 | $370 | preferred grid pick while PWR parked |
| VRT | $240 | $300 | buy dips, 30-50% drawdowns normal |
| ANET | $145 | $165 | cleanest, most affordable core anchor |
| SYM | $40 | $55 | cheap per share, big backlog |
| TER | $300 | $370 | cyclical — use dips |
| CBRS | $200 | $260 | speculative, keep small |
| IONQ | $40 | $55 | speculative, small + consistent |

Zone display logic:
- price ≤ aggressive → 🟢 Aggressive Buy
- price ≤ safe → 🟡 Safe Entry
- price > safe → 🔴 Wait

---

## 4. Allocation rules

1. Core-first when in good zones. Core holdings in 🟢 or 🟡 get priority.
   A core name in its aggressive zone is top priority.
2. Speculative bought small but consistently. CBRS and IONQ get steady small
   allocations even on dips — never skipped, never scaled up large.
   Cap CBRS ≈ 9% and IONQ ≈ 5% of total portfolio value.
3. PWR skipped for routine buys until < $590. Fund from opportunity cash
   or year-end lump sum only.
4. Whole shares only. Compute integer share counts using current price × FX.
   Leftover CAD rolls to opportunity cash.
5. Opportunity cash = dry powder for core names dropping into aggressive zone
   (e.g. VRT < $240, ANET < $145, CEG < $280).

Initial deployment (June 2026): $16K CAD total = $15K deployed + $1K reserve.
Initial weighting: CEG/SYM/ANET heaviest, TER/MTZ/VRT/ETN medium, PWR skipped,
CBRS/IONQ small + consistent. ~$2,350 CAD held as dry powder.

---

## 5. The three modes

### Mode 1 — Price Check (free, instant, no LLM call)
- Fetch live prices for all 10 tickers + 52-week high/low + analyst target.
- Show each with zone color (🟢/🟡/🔴) and a range bar (thermometer style)
  showing where current price sits between 52-week low and high.
- Default screen. Open → glance → done. No cost beyond the price API.

### Mode 2 — Buy Mode (light compute, on demand)
- User inputs cash available this round (CAD).
- Engine runs allocation rules from section 4 against current prices.
- Output a priority-ranked buy chart: ticker, zone now, whole shares to buy,
  CAD per buy, % of available cash used, leftover to opportunity cash.
- Core-in-zone first, speculative small+consistent, PWR skipped per rules.
- Pure math on live prices — no LLM call needed.

### Mode 3 — Thesis Review (manual trigger only, paid LLM call)
- Fires ONLY when user taps it. Never scheduled, never automatic.
- Pull recent news + policy/bill items + industry shifts per thesis layer
  (Power & Energy / Grid & Infrastructure / Digital Infrastructure /
  Robotics & Automation / AI Compute / Quantum).
- Call Claude API to interpret: what helps or hurts the thesis per layer,
  overall thesis health (intact / strengthening / cracks showing).
- Only mode that costs an LLM call. Gated behind an explicit button.

---

## 6. Data sources

- Prices / ranges / targets: Finnhub free tier (covers 10 tickers easily).
  API key in env var FINNHUB_API_KEY — never hardcode.
- News (Mode 3 only): Finnhub news endpoint or similar.
- Claude API (Mode 3 only): standard /v1/messages. Default to claude-sonnet-4-6
  for cost efficiency; allow model to be configurable.
- All keys in environment variables. Never commit secrets.

---

## 7. Guardrails (surface in UI)

- Target levels are planning guides, not predictions or guarantees.
- Prices are USD; contributions are CAD — show share counts as approximate
  and recompute on live FX when possible.
- Informational only, not financial advice.
- Verify live price before placing any order in CIBC Investor Edge.
- Mode 3 read is only as good as the news fed to it — not a replacement
  for deliberate human review at major inflection points.

---

## 8. Visual style

Dark, data-forward, calm. Prior static version used:
- Background: #0a0e14
- Accent copper: #d98b4a / #f0a55f
- Accent teal: #39c6c0
- Buy green: #3ec77a
- Safe yellow: #e7b84b
- Wait red: #e0644f
- Fonts: Sora (display/headings) + IBM Plex Mono (numbers/data) + Inter (body)

Match this family. Mobile-first. Cards per holding. Range bars. Zone colors
on both the left card edge AND the ticker name text itself.

---

## 9. Build order

1. Scaffold the app (React + Vite or Next.js — keep it simple).
2. Mode 1 first. Get it deployable to Netlify and on the phone Home Screen
   before building anything else.
3. Mode 2 second (allocation engine + buy chart).
4. Mode 3 last (news fetch + Claude API interpretation, manual button only).
5. Keep all holdings, zones, FX, and weights in a config file so the plan
   can evolve over 10 years without a rewrite.