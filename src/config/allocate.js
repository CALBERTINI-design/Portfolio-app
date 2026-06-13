import { HOLDINGS, getZone } from './portfolio'

// Allocation rules per CLAUDE.md section 4.
// Priority order: core in 🟢 aggressive zone, then core in 🟡 safe zone,
// then speculative (always gets a small, capped allocation, never skipped),
// then anything left over rolls to opportunity cash.
// PWR is naturally excluded by the zone check while it's >$590 (🔴 Wait).
export function computeBuyPlan(cashCAD, fx, quotes) {
  const rows = []
  let remaining = cashCAD

  const withZone = HOLDINGS.map((holding) => {
    const quote = quotes[holding.ticker]
    const price = quote?.price ?? null
    const zone = getZone(price, holding)
    return { holding, price, zone }
  })

  const buyWholeShares = (holding, price, zone, cashForThis, note) => {
    if (price == null) {
      rows.push({ ticker: holding.ticker, name: holding.name, zone, shares: 0, cadSpent: 0, pctOfCash: 0, note: 'No live price' })
      return
    }
    const priceCAD = price * fx
    const shares = Math.floor(cashForThis / priceCAD)
    const cadSpent = shares * priceCAD
    remaining -= cadSpent
    rows.push({
      ticker: holding.ticker,
      name: holding.name,
      zone,
      shares,
      cadSpent,
      pctOfCash: cashCAD > 0 ? (cadSpent / cashCAD) * 100 : 0,
      note: shares === 0 ? (note ?? 'Allocation too small for 1 whole share') : null,
    })
  }

  const coreGreen = withZone.filter((h) => h.holding.tier === 'core' && h.zone.color === 'green')
  const coreYellow = withZone.filter((h) => h.holding.tier === 'core' && h.zone.color === 'yellow')
  const speculative = withZone.filter((h) => h.holding.tier === 'speculative')

  for (const { holding, price, zone } of [...coreGreen, ...coreYellow]) {
    buyWholeShares(holding, price, zone, remaining, null)
  }

  for (const { holding, price, zone } of speculative) {
    const cap = cashCAD * (holding.buyRoundCapPct ?? 0.05)
    const cashForThis = Math.min(cap, Math.max(remaining, 0))
    buyWholeShares(holding, price, zone, cashForThis, 'Small consistent allocation — too little for 1 whole share this round')
  }

  const opportunityCash = Math.max(remaining, 0)

  return { rows, opportunityCash, cashCAD }
}
