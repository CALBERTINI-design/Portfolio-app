import { HOLDINGS, getZone } from './portfolio'

// Allocation rules per CLAUDE.md section 4.
//
// currentShares: optional { TICKER: wholeShares } map of what you already hold.
//
// Pass 1 (trickle to target): cash trickles into each core holding only while
// it's 🟢/🟡, filling the "room" between its current value and its target
// weight of the post-buy total. Core names in 🔴 (incl. PWR while >$590) get
// zero room and roll to opportunity cash. Speculative names always get their
// room regardless of zone (per CLAUDE.md — never skipped, never scaled up).
//
// Pass 2 (beyond target, opt-in via extendBeyondTarget): for any holding
// that's 🟢/🟡 and already at/over its target weight, remaining cash trickles
// in one share at a time, round-robin, marked beyondTarget — shown as a
// separate "purple" status in the UI so it's clear this is optional
// extra buying past the target allocation.
export function computeBuyPlan(cashCAD, fx, quotes, currentShares = {}, extendBeyondTarget = false) {
  let remaining = cashCAD

  const withInfo = HOLDINGS.map((holding) => {
    const quote = quotes[holding.ticker]
    const price = quote?.price ?? null
    const zone = getZone(price, holding, quote)
    const priceCAD = price != null ? price * fx : null
    const sharesHeld = currentShares[holding.ticker] ?? 0
    const currentValueCAD = priceCAD != null ? sharesHeld * priceCAD : 0
    return { holding, price, priceCAD, zone, currentValueCAD }
  })

  const currentTotalCAD = withInfo.reduce((sum, h) => sum + h.currentValueCAD, 0)
  const postBuyTotal = currentTotalCAD + cashCAD

  const candidates = withInfo.map(({ holding, price, priceCAD, zone, currentValueCAD }) => {
    const targetValueCAD = postBuyTotal * (holding.targetWeightPct ?? 0)
    let room = Math.max(targetValueCAD - currentValueCAD, 0)
    const buyableZone = zone.color === 'green' || zone.color === 'yellow'

    if (holding.tier === 'core' && !buyableZone) room = 0
    if ((holding.targetWeightPct ?? 0) <= 0) room = 0

    const overTarget = (holding.targetWeightPct ?? 0) > 0 && room === 0 && buyableZone

    let priority = 3
    if (holding.tier === 'core' && zone.color === 'green') priority = 1
    else if (holding.tier === 'core' && zone.color === 'yellow') priority = 2
    else if (holding.tier === 'speculative') priority = 2.5

    return { holding, price, priceCAD, zone, currentValueCAD, room, priority, overTarget, buyableZone }
  })

  candidates.sort((a, b) => a.priority - b.priority || b.room - a.room)

  const rowsByTicker = new Map()

  for (const { holding, price, priceCAD, zone, room } of candidates) {
    if ((holding.targetWeightPct ?? 0) <= 0) continue

    if (holding.tier === 'core' && zone.color === 'red') {
      rowsByTicker.set(holding.ticker, { ticker: holding.ticker, name: holding.name, zone, shares: 0, cadSpent: 0, pctOfCash: 0, status: 'skip', note: 'In 🔴 Wait — skipped this round, allocation rolls to opportunity cash' })
      continue
    }

    if (price == null) {
      rowsByTicker.set(holding.ticker, { ticker: holding.ticker, name: holding.name, zone, shares: 0, cadSpent: 0, pctOfCash: 0, status: 'skip', note: 'No live price' })
      continue
    }

    const cashForThis = Math.min(room, Math.max(remaining, 0))
    const shares = Math.floor(cashForThis / priceCAD)
    const cadSpent = shares * priceCAD
    remaining -= cadSpent

    rowsByTicker.set(holding.ticker, {
      ticker: holding.ticker,
      name: holding.name,
      zone,
      shares,
      cadSpent,
      pctOfCash: cashCAD > 0 ? (cadSpent / cashCAD) * 100 : 0,
      status: 'target',
      note: shares === 0 ? 'Already at/near target weight, or too little room for 1 whole share' : null,
    })
  }

  // Pass 2: trickle remaining cash, one share at a time, into 🟢/🟡 names
  // that are already at/over their target (or have no target, e.g. PWR).
  if (extendBeyondTarget) {
    const extraEligible = candidates
      .filter((c) => c.buyableZone && c.priceCAD != null)
      .sort((a, b) => (a.zone.color === 'green' ? 0 : 1) - (b.zone.color === 'green' ? 0 : 1))

    let progressed = true
    while (remaining > 0 && progressed) {
      progressed = false
      for (const c of extraEligible) {
        if (c.priceCAD <= remaining) {
          remaining -= c.priceCAD
          const existing = rowsByTicker.get(c.holding.ticker)
          if (existing) {
            existing.shares += 1
            existing.cadSpent += c.priceCAD
            existing.pctOfCash = cashCAD > 0 ? (existing.cadSpent / cashCAD) * 100 : 0
            existing.status = 'beyond'
            existing.note = 'Includes extra shares beyond target allocation'
          } else {
            rowsByTicker.set(c.holding.ticker, {
              ticker: c.holding.ticker,
              name: c.holding.name,
              zone: c.zone,
              shares: 1,
              cadSpent: c.priceCAD,
              pctOfCash: cashCAD > 0 ? (c.priceCAD / cashCAD) * 100 : 0,
              status: 'beyond',
              note: 'Extra shares beyond target allocation (no target weight set)',
            })
          }
          progressed = true
        }
      }
    }
  }

  const rows = Array.from(rowsByTicker.values()).sort((a, b) => b.cadSpent - a.cadSpent)

  const opportunityCash = Math.max(remaining, 0)

  return { rows, opportunityCash, cashCAD }
}
