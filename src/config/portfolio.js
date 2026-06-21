// Portfolio config — edit here as thesis/zones evolve. See CLAUDE.md.

export const FX_USD_TO_CAD = 1.38

// thesisFit: static 0-10 score reflecting how well each holding fits the
// AI/electrification/automation infrastructure thesis. Set manually here,
// update when conviction changes. Used as one of the 5 scoring lenses.
export const HOLDINGS = [
  { ticker: 'AIPO', name: 'AI & Power Infrastructure ETF', layer: 'ETFs',                  tier: 'core',        targetWeightPct: 0.32,  thesisFit: 10, isETF: true },
  { ticker: 'SETM', name: 'Sprott Critical Materials ETF', layer: 'ETFs',                  tier: 'core',        targetWeightPct: 0.23,  thesisFit: 8,  isETF: true },
  { ticker: 'ZBRA', name: 'Zebra Technologies',            layer: 'Robotics & Automation', tier: 'core',        targetWeightPct: 0.10,  thesisFit: 7  },
  { ticker: 'SYM',  name: 'Symbotic',                      layer: 'Robotics & Automation', tier: 'core',        targetWeightPct: 0.12,  thesisFit: 9  },
  { ticker: 'IONQ', name: 'IonQ',                          layer: 'Quantum',               tier: 'speculative', targetWeightPct: 0.11,  thesisFit: 3  },
  { ticker: 'QBTS', name: 'D-Wave Quantum',                layer: 'Quantum',               tier: 'speculative', targetWeightPct: 0.07,  thesisFit: 3  },
  { ticker: 'RGTI', name: 'Rigetti Computing',             layer: 'Quantum',               tier: 'speculative', targetWeightPct: 0.05,  thesisFit: 3  },
]

export const WATCHLIST = ['MRVL', 'NVDA', 'PLTR']

// Zone scoring: 5 lenses averaged to a 0-10 score.
//
// 1. volatility_52w_range (live): where price sits in 52wk range.
//    Bottom 10%→10, ≤20%→9, ≤30%→8, ≤40%→7, ≤50%→6,
//    ≤60%→5, ≤70%→4, ≤80%→3, ≤90%→2, top 10%→1. Null→5.
//
// 2. execution_risk (live): avg earnings surprise % over last 4 quarters.
//    >5%→8, >0%→6, =0→5, <0%→3. Null→5 (ETFs/no data).
//
// 3. valuation_upside (live): analyst consensus target vs current price.
//    ≥30% upside→9, ≥20%→8, ≥10%→7, ≥0%→5, negative→3. Null→5.
//
// 4. thesis_fit_infrastructure (static): set per holding above (thesisFit).
//    Reflects long-term conviction in the thesis fit, not price.
//
// 5. demand_visibility (live): daily % vs top 3 peers (sector strength).
//    relativeStrength ≥2→8, ≥1→7, ≥0→5, <0→3. Null→5.
//
// Average of all 5 → overall score 0-10.
// ≥8 → 🟢 Aggressive Buy | ≥6 → 🟡 Safe Buy | ≥4 → 🟠 Wait | <4 → 🔴 Hold Minimal
function etfZone(price, holding, quote) {
  const modifiers = []
  const low = quote?.weekLow52 ?? null
  const high = quote?.weekHigh52 ?? null
  const dp = quote?.change ?? null

  // 1. 52wk range position (same as stocks)
  let rangeScore = 5
  if (low != null && high != null && high > low) {
    const rangePct = ((Math.min(Math.max(price, low), high) - low) / (high - low)) * 100
    if      (rangePct <= 10) rangeScore = 10
    else if (rangePct <= 20) rangeScore = 9
    else if (rangePct <= 30) rangeScore = 8
    else if (rangePct <= 40) rangeScore = 7
    else if (rangePct <= 50) rangeScore = 6
    else if (rangePct <= 60) rangeScore = 5
    else if (rangePct <= 70) rangeScore = 4
    else if (rangePct <= 80) rangeScore = 3
    else if (rangePct <= 90) rangeScore = 2
    else                     rangeScore = 1
  }
  modifiers.push({ key: 'range', value: rangeScore })

  // 2. Drawdown from 52wk high — deeper dip = better entry
  let drawdownScore = 5
  if (high != null && high > 0) {
    const drawdownPct = ((high - price) / high) * 100
    if      (drawdownPct >= 25) drawdownScore = 10
    else if (drawdownPct >= 15) drawdownScore = 8
    else if (drawdownPct >= 10) drawdownScore = 7
    else if (drawdownPct >= 5)  drawdownScore = 6
    else if (drawdownPct >= 2)  drawdownScore = 5
    else                        drawdownScore = 3
  }
  modifiers.push({ key: 'drawdown', value: drawdownScore })

  // 3. Daily momentum — down day = dip = mild buy signal for accumulator
  let momentumScore = 5
  if (dp != null) {
    if      (dp <= -2) momentumScore = 9
    else if (dp <   0) momentumScore = 7
    else if (dp <   1) momentumScore = 5
    else if (dp <   3) momentumScore = 4
    else               momentumScore = 3
  }
  modifiers.push({ key: 'momentum', value: momentumScore })

  // 4. Thesis fit (static)
  const thesisScore = holding.thesisFit ?? 5
  modifiers.push({ key: 'thesis', value: thesisScore })

  // 5. Distance from 52wk midpoint — below midpoint = favorable
  let midpointScore = 5
  if (low != null && high != null && high > low) {
    const midpoint = (low + high) / 2
    const pctFromMid = ((price - midpoint) / midpoint) * 100
    if      (pctFromMid <= -20) midpointScore = 9
    else if (pctFromMid <= -10) midpointScore = 8
    else if (pctFromMid <=   0) midpointScore = 7
    else if (pctFromMid <=  10) midpointScore = 5
    else if (pctFromMid <=  20) midpointScore = 4
    else                        midpointScore = 3
  }
  modifiers.push({ key: 'midpoint', value: midpointScore })

  const score = Math.round(((rangeScore + drawdownScore + momentumScore + thesisScore + midpointScore) / 5) * 10) / 10

  let color, label
  if      (score >= 8) { color = 'green';  label = 'Aggressive Buy' }
  else if (score >= 6) { color = 'yellow'; label = 'Safe Buy'       }
  else if (score >= 4) { color = 'orange'; label = 'Wait'           }
  else                 { color = 'red';    label = 'Hold Minimal'   }

  return { label, color, score, modifiers }
}

export function getZone(price, holding, quote = null) {
  if (price == null) return { label: 'Unknown', color: 'unknown', score: null, modifiers: [] }
  if (holding.isETF) return etfZone(price, holding, quote)

  const modifiers = []

  // 1. Volatility / 52wk range position
  const low = quote?.weekLow52 ?? null
  const high = quote?.weekHigh52 ?? null
  let rangeScore = 5
  if (low != null && high != null && high > low) {
    const rangePct = ((Math.min(Math.max(price, low), high) - low) / (high - low)) * 100
    if      (rangePct <= 10) rangeScore = 10
    else if (rangePct <= 20) rangeScore = 9
    else if (rangePct <= 30) rangeScore = 8
    else if (rangePct <= 40) rangeScore = 7
    else if (rangePct <= 50) rangeScore = 6
    else if (rangePct <= 60) rangeScore = 5
    else if (rangePct <= 70) rangeScore = 4
    else if (rangePct <= 80) rangeScore = 3
    else if (rangePct <= 90) rangeScore = 2
    else                     rangeScore = 1
  }
  modifiers.push({ key: 'range', value: rangeScore })

  // 2. Execution risk / earnings trend
  const earnings = quote?.earningsTrend ?? null
  let executionScore = 5
  if (earnings != null) {
    if      (earnings.avgSurprisePct > 5)  executionScore = 8
    else if (earnings.avgSurprisePct > 0)  executionScore = 6
    else if (earnings.avgSurprisePct < 0)  executionScore = 3
    else                                   executionScore = 5
  }
  modifiers.push({ key: 'execution', value: executionScore })

  // 3. Valuation upside / analyst target
  const target = quote?.analystTarget ?? null
  let valuationScore = 5
  if (target != null) {
    const upsidePct = ((target - price) / price) * 100
    if      (upsidePct >= 30) valuationScore = 9
    else if (upsidePct >= 20) valuationScore = 8
    else if (upsidePct >= 10) valuationScore = 7
    else if (upsidePct >= 0)  valuationScore = 5
    else                      valuationScore = 3
  }
  modifiers.push({ key: 'valuation', value: valuationScore })

  // 4. Thesis fit (static per holding)
  const thesisScore = holding.thesisFit ?? 5
  modifiers.push({ key: 'thesis', value: thesisScore })

  // 5. Demand visibility / sector relative strength
  const sector = quote?.sectorStrength ?? null
  let demandScore = 5
  if (sector != null) {
    if      (sector.relativeStrength >= 2)  demandScore = 8
    else if (sector.relativeStrength >= 1)  demandScore = 7
    else if (sector.relativeStrength >= 0)  demandScore = 5
    else                                    demandScore = 3
  }
  modifiers.push({ key: 'demand', value: demandScore })

  const score = Math.round(((rangeScore + executionScore + valuationScore + thesisScore + demandScore) / 5) * 10) / 10

  let color, label
  if      (score >= 8) { color = 'green';  label = 'Aggressive Buy' }
  else if (score >= 6) { color = 'yellow'; label = 'Safe Buy'       }
  else if (score >= 4) { color = 'orange'; label = 'Wait'           }
  else                 { color = 'red';    label = 'Hold Minimal'   }

  return { label, color, score, modifiers }
}
