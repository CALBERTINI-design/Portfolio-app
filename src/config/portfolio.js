// Portfolio config — edit here as thesis/zones evolve. See CLAUDE.md.

export const FX_USD_TO_CAD = 1.38

// capexPeakStart / capexPeakEnd: the expected capex cycle peak window per holding.
// Pre-peak = accumulate aggressively. Post-peak = wait/sell and redeploy.
export const HOLDINGS = [
  { ticker: 'AIPO', name: 'AI & Power Infrastructure ETF', layer: 'ETFs',                  tier: 'core',        targetWeightPct: 0.30, capexPeakStart: 2026, capexPeakEnd: 2028, isETF: true },
  { ticker: 'SETM', name: 'Sprott Critical Materials ETF', layer: 'ETFs',                  tier: 'core',        targetWeightPct: 0.30, capexPeakStart: 2026, capexPeakEnd: 2030, isETF: true },
  { ticker: 'DRAM', name: 'Roundhill Memory ETF',          layer: 'ETFs',                  tier: 'core',        targetWeightPct: 0.10, capexPeakStart: 2026, capexPeakEnd: 2029, isETF: true },
  { ticker: 'LEU',  name: 'Centrus Energy Corp',           layer: 'Nuclear Energy',         tier: 'core',        targetWeightPct: 0.10, capexPeakStart: 2026, capexPeakEnd: 2029 },
  { ticker: 'IONQ', name: 'IonQ Inc',                      layer: 'Quantum',               tier: 'speculative', targetWeightPct: 0.07, capexPeakStart: 2026, capexPeakEnd: 2032 },
  { ticker: 'QBTS', name: 'D-Wave Quantum',                layer: 'Quantum',               tier: 'speculative', targetWeightPct: 0.05, capexPeakStart: 2026, capexPeakEnd: 2032 },
  { ticker: 'RGTI', name: 'Rigetti Computing',             layer: 'Quantum',               tier: 'speculative', targetWeightPct: 0.05, capexPeakStart: 2026, capexPeakEnd: 2032 },
  { ticker: 'SYM',  name: 'Symbotic Inc',                  layer: 'Robotics & Automation', tier: 'core',        targetWeightPct: 0.03, capexPeakStart: 2028, capexPeakEnd: 2033 },
]

export const WATCHLIST = [
  { ticker: 'GEV', name: 'GE Vernova', layer: 'Power & Grid', capexPeakStart: 2026, capexPeakEnd: 2029 },
]

function capexScore(holding) {
  const now   = new Date().getFullYear()
  const start = holding.capexPeakStart
  const end   = holding.capexPeakEnd
  if (now < start - 1) return 9
  if (now < start)     return 8
  if (now <= end - 1)  return 7
  if (now === end)     return 5
  if (now <= end + 2)  return 3
  return 2
}

// 4 zones:
// Sell      → capex cycle post-peak (overrides score) — redeploy capital
// Accumulate → score ≥ 7, capex active
// Wait/Hold  → score 5-6.9, capex active
// Don't Add  → score < 5, price extended but thesis still running
function zoneFromScore(score, holding) {
  const cx = capexScore(holding)
  if (cx <= 3) return { color: 'red',    label: 'Sell'        }
  if (score >= 7) return { color: 'green',  label: 'Accumulate'  }
  if (score >= 5) return { color: 'yellow', label: 'Safe / Small Add' }
  return              { color: 'orange', label: "Don't Add"   }
}

function etfZone(price, holding, quote) {
  const modifiers = []
  const low  = quote?.weekLow52  ?? null
  const high = quote?.weekHigh52 ?? null
  const dp   = quote?.change     ?? null

  let rangeScore = 5
  if (low != null && high != null && high > low) {
    const pct = ((Math.min(Math.max(price, low), high) - low) / (high - low)) * 100
    if      (pct <= 10) rangeScore = 10
    else if (pct <= 20) rangeScore = 9
    else if (pct <= 30) rangeScore = 8
    else if (pct <= 40) rangeScore = 7
    else if (pct <= 50) rangeScore = 6
    else if (pct <= 60) rangeScore = 5
    else if (pct <= 70) rangeScore = 4
    else if (pct <= 80) rangeScore = 3
    else if (pct <= 90) rangeScore = 2
    else                rangeScore = 1
  }
  modifiers.push({ key: 'range', value: rangeScore })

  let drawdownScore = 5
  if (high != null && high > 0) {
    const dd = ((high - price) / high) * 100
    if      (dd >= 25) drawdownScore = 10
    else if (dd >= 15) drawdownScore = 8
    else if (dd >= 10) drawdownScore = 7
    else if (dd >= 5)  drawdownScore = 6
    else if (dd >= 2)  drawdownScore = 5
    else               drawdownScore = 3
  }
  modifiers.push({ key: 'drawdown', value: drawdownScore })

  let momentumScore = 5
  if (dp != null) {
    if      (dp <= -2) momentumScore = 9
    else if (dp <   0) momentumScore = 7
    else if (dp <   1) momentumScore = 5
    else if (dp <   3) momentumScore = 4
    else               momentumScore = 3
  }
  modifiers.push({ key: 'momentum', value: momentumScore })

  const cx = capexScore(holding)
  modifiers.push({ key: 'capex', value: cx })

  const score = Math.round(((rangeScore + drawdownScore + momentumScore + cx) / 4) * 10) / 10
  return { ...zoneFromScore(score, holding), score, modifiers }
}

export function getZone(price, holding, quote = null) {
  if (price == null) return { label: 'Unknown', color: 'unknown', score: null, modifiers: [] }
  if (holding.isETF) return etfZone(price, holding, quote)

  const modifiers = []
  const low  = quote?.weekLow52  ?? null
  const high = quote?.weekHigh52 ?? null

  let rangeScore = 5
  if (low != null && high != null && high > low) {
    const pct = ((Math.min(Math.max(price, low), high) - low) / (high - low)) * 100
    if      (pct <= 10) rangeScore = 10
    else if (pct <= 20) rangeScore = 9
    else if (pct <= 30) rangeScore = 8
    else if (pct <= 40) rangeScore = 7
    else if (pct <= 50) rangeScore = 6
    else if (pct <= 60) rangeScore = 5
    else if (pct <= 70) rangeScore = 4
    else if (pct <= 80) rangeScore = 3
    else if (pct <= 90) rangeScore = 2
    else                rangeScore = 1
  }
  modifiers.push({ key: 'range', value: rangeScore })

  const earnings = quote?.earningsTrend ?? null
  let executionScore = 5
  if (earnings != null) {
    if      (earnings.avgSurprisePct > 5)  executionScore = 8
    else if (earnings.avgSurprisePct > 0)  executionScore = 6
    else if (earnings.avgSurprisePct < 0)  executionScore = 3
    else                                   executionScore = 5
  }
  modifiers.push({ key: 'execution', value: executionScore })

  const target = quote?.analystTarget ?? null
  let valuationScore = 5
  if (target != null) {
    const upside = ((target - price) / price) * 100
    if      (upside >= 30) valuationScore = 9
    else if (upside >= 20) valuationScore = 8
    else if (upside >= 10) valuationScore = 7
    else if (upside >= 0)  valuationScore = 5
    else                   valuationScore = 3
  }
  modifiers.push({ key: 'valuation', value: valuationScore })

  const cx = capexScore(holding)
  modifiers.push({ key: 'capex', value: cx })

  const score = Math.round(((rangeScore + executionScore + valuationScore + cx) / 4) * 10) / 10
  return { ...zoneFromScore(score, holding), score, modifiers }
}
