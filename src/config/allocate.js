import { HOLDINGS, getZone } from './portfolio'

// Allocation per CLAUDE.md section 4.
//
// currentValuesCAD / totalCAD (optional, from shares held entered in Buy
// Mode) refine the buy suggestion as you approach your target weight:
//
// - room = max(totalCAD * targetWeightPct - currentValueCAD, 0) — how much
//   $ is left before this holding hits its overall target allocation.
// - The suggested buy is min(cashCAD * targetWeightPct, room) — so as a
//   holding gets close to its target %, the suggestion shrinks to fit
//   whatever's left, rather than always suggesting the full cash slice.
// - If room is too small to buy even 1 more whole share, the holding is
//   flagged `atTarget: true`. The UI shows this as a purple trim/border
//   around the card, on top of its normal zone color — so you still see
//   "this is a 🟢 buy if you want to diversify further," you just also
//   know you've effectively hit your target % and any further buy here
//   is optional/over-target.
//
// - score >= 1.5 (🟢 Aggressive Buy, or upper 🟡 Safe Entry — excludes the
//   bottom third of the yellow range): buy the whole shares that fit the
//   target $ allocation for this round.
// - score < 1.5 (lower 🟡 or 🔴 Wait) or no live price: skipped this
//   round — its target $ allocation rolls to opportunity cash instead.
export function computeBuyPlan(cashCAD, fx, quotes, currentValuesCAD = {}, totalCAD = cashCAD) {
  const rows = []
  let spent = 0

  for (const holding of HOLDINGS) {
    const targetWeightPct = holding.targetWeightPct ?? 0
    if (targetWeightPct <= 0) continue

    const quote = quotes[holding.ticker]
    const price = quote?.price ?? null
    const zone = getZone(price, holding, quote)
    const targetCAD = cashCAD * targetWeightPct
    const overallTargetCAD = totalCAD * targetWeightPct
    const currentCAD = currentValuesCAD[holding.ticker] ?? 0
    const room = Math.max(overallTargetCAD - currentCAD, 0)

    if (price == null) {
      const atTarget = overallTargetCAD > 0 && room <= 0
      rows.push({ ticker: holding.ticker, name: holding.name, zone, shares: 0, cadSpent: 0, pctOfCash: 0, targetCAD, atTarget, status: 'skip', note: 'No live price' })
      continue
    }

    const priceCAD = price * fx
    const atTarget = overallTargetCAD > 0 && room < priceCAD
    const nearGreen = zone.score >= 6

    if (!nearGreen) {
      rows.push({ ticker: holding.ticker, name: holding.name, zone, shares: 0, cadSpent: 0, pctOfCash: 0, targetCAD, atTarget, status: 'skip', note: 'Score below 6 (Wait/Sell) — allocation rolls to opportunity cash' })
      continue
    }

    const allocCAD = Math.min(targetCAD, room)
    const shares = Math.floor(allocCAD / priceCAD)
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
      atTarget,
      status: 'buy',
      note: shares === 0
        ? (atTarget
          ? 'At/near overall target allocation — remaining room too small for 1 whole share'
          : 'In zone, but allocation too small for 1 whole share')
        : null,
    })
  }

  rows.sort((a, b) => b.cadSpent - a.cadSpent)

  const opportunityCash = Math.max(cashCAD - spent, 0)

  return { rows, opportunityCash, cashCAD }
}
