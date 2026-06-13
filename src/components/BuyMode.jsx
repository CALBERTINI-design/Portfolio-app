import { useState } from 'react'
import { FX_USD_TO_CAD, HOLDINGS, getZone } from '../config/portfolio'
import { computeBuyPlan } from '../config/allocate'

export default function BuyMode({ quotes }) {
  const [cash, setCash] = useState('')
  const [showHoldings, setShowHoldings] = useState(false)
  const [currentShares, setCurrentShares] = useState({})
  const [plan, setPlan] = useState(null)

  const cashCAD = parseFloat(cash) || 0

  const currentValuesCAD = {}
  let portfolioCAD = 0
  for (const h of HOLDINGS) {
    const shares = parseFloat(currentShares[h.ticker]) || 0
    const quote = quotes[h.ticker]
    const priceCAD = quote?.price != null ? quote.price * FX_USD_TO_CAD : 0
    const valueCAD = shares * priceCAD
    currentValuesCAD[h.ticker] = valueCAD
    portfolioCAD += valueCAD
  }

  const totalCAD = portfolioCAD + cashCAD

  const handleCalculate = () => {
    if (cashCAD <= 0) return
    setPlan(computeBuyPlan(cashCAD, FX_USD_TO_CAD, quotes, currentValuesCAD, totalCAD))
  }

  return (
    <div className="buy-mode">
      <div className="buy-input-row">
        <input
          type="number"
          inputMode="decimal"
          placeholder="Cash available (CAD)"
          value={cash}
          onChange={(e) => setCash(e.target.value)}
          className="buy-input"
        />
        <button className="refresh-btn" onClick={handleCalculate}>Calculate</button>
      </div>

      {portfolioCAD > 0 && (
        <div className="portfolio-value-row">
          Portfolio value (auto, CAD): <strong>${portfolioCAD.toFixed(2)}</strong>
        </div>
      )}

      <button className="tab-btn holdings-toggle" onClick={() => setShowHoldings((s) => !s)}>
        {showHoldings ? 'Hide' : 'Add'} shares held per holding (optional — auto-fills portfolio value, flags 🟣 at-target)
      </button>

      {showHoldings && (
        <div className="holdings-grid">
          {HOLDINGS.filter((h) => (h.targetWeightPct ?? 0) > 0).map((h) => (
            <label key={h.ticker} className="holdings-field">
              <span>{h.ticker}</span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="0 sh"
                value={currentShares[h.ticker] ?? ''}
                onChange={(e) => setCurrentShares((s) => ({ ...s, [h.ticker]: e.target.value }))}
              />
            </label>
          ))}
        </div>
      )}

      {totalCAD > 0 && (
        <div className="ref-table">
          <h2>Target Allocation Reference</h2>
          <p className="ref-sub">
            Target $ at each weight on your total of ${totalCAD.toFixed(2)} CAD
            (${portfolioCAD.toFixed(2)} held{showHoldings ? ', auto-calculated from shares × live price' : ''} + ${cashCAD.toFixed(2)} this round) —
            shares shown are this round's worth at today's prices, regardless of zone.
          </p>
          {HOLDINGS.filter((h) => (h.targetWeightPct ?? 0) > 0).map((h) => {
            const quote = quotes[h.ticker]
            const price = quote?.price ?? null
            const zone = getZone(price, h, quote)
            const targetCAD = totalCAD * h.targetWeightPct
            const cashTargetCAD = cashCAD * h.targetWeightPct
            const priceCAD = price != null ? price * FX_USD_TO_CAD : null
            const sharesNeeded = priceCAD != null ? Math.floor(cashTargetCAD / priceCAD) : null
            const currentCAD = currentValuesCAD[h.ticker] ?? 0
            const atTarget = targetCAD > 0 && currentCAD >= targetCAD
            return (
              <div key={h.ticker} className="ref-row">
                <span className={`ticker zone-${zone.color}`}>{h.ticker}</span>
                <span className="ref-pct">{(h.targetWeightPct * 100).toFixed(0)}%</span>
                <span className="ref-cad">${targetCAD.toFixed(2)}</span>
                <span className="ref-shares">{sharesNeeded != null ? `${sharesNeeded} sh` : '—'}</span>
                <span className={`zone-badge zone-${zone.color}`}>{zone.label}</span>
                {atTarget && <span className="zone-badge zone-purple">At target — optional</span>}
              </div>
            )
          })}
        </div>
      )}

      {plan && (
        <div className="cards">
          {plan.rows.map((row) => (
            <div key={row.ticker} className={`card zone-${row.zone.color}${row.atTarget ? ' at-target-trim' : ''}`}>
              <div className="card-top">
                <span className={`ticker zone-${row.zone.color}`}>{row.ticker}</span>
                <span className="name">{row.name}</span>
              </div>
              <div className="price-row">
                <span className="price">
                  {row.status === 'buy' ? `${row.shares} share${row.shares === 1 ? '' : 's'}` : 'Skip this round'}
                </span>
                <span className={`zone-badge zone-${row.zone.color}`}>{row.zone.label}</span>
                {row.atTarget && <span className="zone-badge zone-purple">At target — optional</span>}
              </div>
              <div className="card-footer">
                <span>
                  {row.status === 'buy'
                    ? `$${row.cadSpent.toFixed(2)} CAD · ${row.pctOfCash.toFixed(1)}% of cash (target $${row.targetCAD.toFixed(2)})`
                    : `Target $${row.targetCAD.toFixed(2)} — not allocated this round`}
                </span>
              </div>
              {row.note && <div className="buy-note">{row.note}</div>}
            </div>
          ))}

          <div className="card opportunity-card">
            <div className="card-top">
              <span className="ticker">Opportunity cash</span>
            </div>
            <div className="price-row">
              <span className="price">${plan.opportunityCash.toFixed(2)} CAD</span>
            </div>
            <div className="card-footer">
              <span>Unallocated this round — skipped names' targets plus rounding remainders. Dry powder for core names dropping into 🟢 (e.g. VRT &lt; $240, ANET &lt; $145, CEG &lt; $280).</span>
            </div>
          </div>
        </div>
      )}

      <div className="guardrails">
        <h2>Guardrails</h2>
        The reference table shows your target allocation regardless of zone.
        The buy plan only allocates that target $ amount for holdings currently
        🟢 Aggressive Buy or near-🟢 — it does not assume all cash gets spent.
        Whole shares only; FX is fixed at {FX_USD_TO_CAD} USD/CAD (edit in
        config to update). Verify live price before placing any order in CIBC
        Investor Edge.
      </div>
    </div>
  )
}
