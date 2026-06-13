// Portfolio config — edit here as thesis/zones evolve. See CLAUDE.md.

export const FX_USD_TO_CAD = 1.36

// targetWeightPct: target share of total invested cash. Steadier, larger
// core names (ETN, CEG, ANET, MTZ) get a higher weight as the lower-volatility
// foundation; more cyclical/volatile core names (VRT, SYM, TER — see CLAUDE.md
// notes on drawdowns) get a smaller weight. Speculative names (CBRS, IONQ) are
// capped smallest (8%/5%). PWR is 0% until it re-enters a buyable zone (<$590).
// Weights sum to ~82%; the remaining ~18% plus whole-share rounding
// remainders roll to opportunity cash. Editable as the thesis evolves.
export const HOLDINGS = [
  { ticker: 'ETN', name: 'Eaton', layer: 'Power & Energy', tier: 'core', targetWeightPct: 0.12 },
  { ticker: 'CEG', name: 'Constellation Energy', layer: 'Power & Energy', tier: 'core', targetWeightPct: 0.12 },
  { ticker: 'PWR', name: 'Quanta Services', layer: 'Grid & Infrastructure', tier: 'core', targetWeightPct: 0 },
  { ticker: 'MTZ', name: 'MasTec', layer: 'Grid & Infrastructure', tier: 'core', targetWeightPct: 0.12 },
  { ticker: 'VRT', name: 'Vertiv', layer: 'Digital Infrastructure', tier: 'core', targetWeightPct: 0.07 },
  { ticker: 'ANET', name: 'Arista Networks', layer: 'Digital Infrastructure', tier: 'core', targetWeightPct: 0.12 },
  { ticker: 'SYM', name: 'Symbotic', layer: 'Robotics & Automation', tier: 'core', targetWeightPct: 0.07 },
  { ticker: 'TER', name: 'Teradyne', layer: 'Robotics & Automation', tier: 'core', targetWeightPct: 0.07 },
  { ticker: 'CBRS', name: 'Cerebras', layer: 'AI Compute', tier: 'speculative', targetWeightPct: 0.08 },
  { ticker: 'IONQ', name: 'IonQ', layer: 'Quantum', tier: 'speculative', targetWeightPct: 0.05 },
]

export const WATCHLIST = ['RGTI', 'QBTS', 'MRVL']

// Zone is purely relative — no fixed $ thresholds. Four lenses, weighted by
// how reliable/strong a signal each one is for a multi-year accumulation:
//
// - 52wk range position (strongest, weight ±2/±1): lower in its range =
//   more room/better entry. Long window, hard to game, most reliable.
// - Earnings trend (solid, weight ±1): beating estimates over recent
//   quarters reflects actual business execution.
// - Analyst target upside (weaker, weight ±1, no +2 tier): consensus
//   targets lag and update infrequently — useful but not decisive alone.
// - Sector relative strength (weakest/noisiest, weight ±0.5): single-day
//   peer comparison, kept as a light tiebreaker only.
//
// Max score 4.5, min -3.5. score >= 3 -> green, score >= 1 -> yellow, else red.
export function getZone(price, holding, quote = null) {
  if (price == null) return { label: 'Unknown', color: 'unknown', score: null, modifiers: [] }

  let score = 0
  const modifiers = []

  const low = quote?.weekLow52 ?? null
  const high = quote?.weekHigh52 ?? null
  let rangePct = null
  if (low != null && high != null && high > low) {
    rangePct = ((Math.min(Math.max(price, low), high) - low) / (high - low)) * 100
  }
  if (rangePct != null) {
    if (rangePct <= 25) { score += 2; modifiers.push({ key: 'range', delta: 2 }) }
    else if (rangePct <= 50) { score += 1; modifiers.push({ key: 'range', delta: 1 }) }
    else if (rangePct > 75) { score -= 1; modifiers.push({ key: 'range', delta: -1 }) }
  }

  const earnings = quote?.earningsTrend ?? null
  if (earnings != null) {
    if (earnings.avgSurprisePct > 0) { score += 1; modifiers.push({ key: 'earnings', delta: 1 }) }
    else if (earnings.avgSurprisePct < 0) { score -= 1; modifiers.push({ key: 'earnings', delta: -1 }) }
  }

  const target = quote?.analystTarget ?? null
  const upsidePct = target != null ? ((target - price) / price) * 100 : null
  if (upsidePct != null) {
    if (upsidePct >= 10) { score += 1; modifiers.push({ key: 'analyst', delta: 1 }) }
    else if (upsidePct < 0) { score -= 1; modifiers.push({ key: 'analyst', delta: -1 }) }
  }

  const sector = quote?.sectorStrength ?? null
  if (sector != null) {
    if (sector.relativeStrength >= 1) { score += 0.5; modifiers.push({ key: 'sector', delta: 0.5 }) }
    else if (sector.relativeStrength <= -1) { score -= 0.5; modifiers.push({ key: 'sector', delta: -0.5 }) }
  }

  let color, label
  if (score >= 3) { color = 'green'; label = 'Aggressive Buy' }
  else if (score >= 1) { color = 'yellow'; label = 'Safe Entry' }
  else { color = 'red'; label = 'Wait' }

  return { label, color, score, modifiers }
}
