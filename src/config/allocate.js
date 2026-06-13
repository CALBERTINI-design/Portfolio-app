import { HOLDINGS, getZone } from './portfolio'

// Allocation per CLAUDE.md section 4, simplified.
//
// The Target Allocation Reference (cash * targetWeightPct) is always the
// basis for sizing — it does not change with zone/score. What changes is
// whether that allocation is actually worth buying right now:
//
// - score >= 1.75 (🟢 Aggressive Buy, or upper 🟡 Safe Entry — excludes the
//   bottom third of the yellow range): buy the whole shares that fit the
//   target $ allocation for this round.
// - score < 1.75 (lower 🟡 or 🔴 Wait) or no live price: skipped this
//   round — its target $ allocation rolls to opportunity cash instead.
//
// This does NOT assume all cash gets spent — only what's currently worth
// allocating does. Remaining cash (skipped allocations + whole-share
// rounding remainders) becomes opportunity cash.
export function computeBuyPlan(cashCAD, fx, quotes) {
  const rows = []
  let spent = 0

  for (const holding of HOLDINGS) {
    const targetWeightPct = holding.targetWeightPct ?? 0
    if (targetWeightPct <= 0) continue

    const quote = quotes[holding.ticker]
    const price = quote?.price ?? null
    const zone = getZone(price, holding, quote)
    const targetCAD = cashCAD * targetWeightPct

    if (price == null) {
      rows.push({ ticker: holding.ticker, name: holding.name, zone, shares: 0, cadSpent: 0, pctOfCash: 0, targetCAD, status: 'skip', note: 'No live price' })
      continue
    }

    const priceCAD = price * fx
    const nearGreen = zone.score >= 1.75

    if (!nearGreen) {
      rows.push({ ticker: holding.ticker, name: holding.name, zone, shares: 0, cadSpent: 0, pctOfCash: 0, targetCAD, status: 'skip', note: 'Score below 1.75 — allocation rolls to opportunity cash' })
      continue
    }

    const shares = Math.floor(targetCAD / priceCAD)
    const cadSpent = shares * priceCAD
    spent += cadSpent

    rows.push({
      ticker: holding.ticker,
      name: holding.name,
      zone,
      shares,
      cadSpent,
      pctOfCash: cashCAD > 0 ? (cadSpent / cashCAD) * 100 : 0,
      targetCAD,
      status: 'buy',
      note: shares === 0 ? 'In zone, but allocation too small for 1 whole share' : null,
    })
  }

  rows.sort((a, b) => b.cadSpent - a.cadSpent)

  const opportunityCash = Math.max(cashCAD - spent, 0)

  return { rows, opportunityCash, cashCAD }
}
