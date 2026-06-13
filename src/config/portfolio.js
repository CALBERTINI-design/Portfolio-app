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
  { ticker: 'ETN', name: 'Eaton', layer: 'Power & Energy', tier: 'core', aggressive: 290, safe: 340, targetWeightPct: 0.12 },
  { ticker: 'CEG', name: 'Constellation Energy', layer: 'Power & Energy', tier: 'core', aggressive: 280, safe: 340, targetWeightPct: 0.12 },
  { ticker: 'PWR', name: 'Quanta Services', layer: 'Grid & Infrastructure', tier: 'core', aggressive: 510, safe: 590, targetWeightPct: 0 },
  { ticker: 'MTZ', name: 'MasTec', layer: 'Grid & Infrastructure', tier: 'core', aggressive: 310, safe: 370, targetWeightPct: 0.12 },
  { ticker: 'VRT', name: 'Vertiv', layer: 'Digital Infrastructure', tier: 'core', aggressive: 240, safe: 300, targetWeightPct: 0.07 },
  { ticker: 'ANET', name: 'Arista Networks', layer: 'Digital Infrastructure', tier: 'core', aggressive: 145, safe: 165, targetWeightPct: 0.12 },
  { ticker: 'SYM', name: 'Symbotic', layer: 'Robotics & Automation', tier: 'core', aggressive: 40, safe: 55, targetWeightPct: 0.07 },
  { ticker: 'TER', name: 'Teradyne', layer: 'Robotics & Automation', tier: 'core', aggressive: 300, safe: 370, targetWeightPct: 0.07 },
  { ticker: 'CBRS', name: 'Cerebras', layer: 'AI Compute', tier: 'speculative', aggressive: 200, safe: 260, targetWeightPct: 0.08 },
  { ticker: 'IONQ', name: 'IonQ', layer: 'Quantum', tier: 'speculative', aggressive: 40, safe: 55, targetWeightPct: 0.05 },
]

export const WATCHLIST = ['RGTI', 'QBTS', 'MRVL']

export function getZone(price, holding) {
  if (price == null) return { label: 'Unknown', color: 'unknown' }
  if (price <= holding.aggressive) return { label: 'Aggressive Buy', color: 'green' }
  if (price <= holding.safe) return { label: 'Safe Entry', color: 'yellow' }
  return { label: 'Wait', color: 'red' }
}
