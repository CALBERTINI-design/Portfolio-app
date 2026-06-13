import { useState } from 'react'
import { FX_USD_TO_CAD, HOLDINGS, getZone } from '../config/portfolio'
import { computeBuyPlan } from '../config/allocate'

export default function BuyMode({ quotes }) {
  const [cash, setCash] = useState('')
  const [showHoldings, setShowHoldings] = useState(false)
  const [shares, setShares] = useState({})
  const [extendBeyondTarget, setExtendBeyondTarget] = useState(false)
  const [plan, setPlan] = useState(null)

  const handleCalculate = () => {
    const cashCAD = parseFloat(cash)
    if (!cashCAD || cashCAD <= 0) return
    const currentShares = {}
    for (const h of HOLDINGS) {
      const val = parseInt(shares[h.ticker], 10)
      if (val > 0) currentShares[h.ticker] = val
    }
    setPlan(computeBuyPlan(cashCAD, FX_USD_TO_CAD, quotes, currentShares, extendBeyondTarget))
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

      <button className="tab-btn holdings-toggle" onClick={() => setShowHoldings((s) => !s)}>
        {showHoldings ? 'Hide' : 'Add'} current holdings (optional)
      </button>

      <label className="extend-toggle">
        <input
          type="checkbox"
          checked={extendBeyondTarget}
          onChange={(e) => setExtendBeyondTarget(e.target.checked)}
        />
        Continue investing past target allocation (🟣 extra buys in 🟢/🟡 names already at target)
      </label>

      {showHoldings && (
        <div className="holdings-grid">
          {HOLDINGS.map((h) => (
            <label key={h.ticker} className="holdings-field">
              <span>{h.ticker}</span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="0"
                value={shares[h.ticker] ?? ''}
                onChange={(e) => setShares((s) => ({ ...s, [h.ticker]: e.target.value }))}
              />
            </label>
          ))}
        </div>
      )}

      {cash && parseFloat(cash) > 0 && (
        <div className="ref-table">
          <h2>Target Allocation Reference</h2>
          <p className="ref-sub">What it'd cost to hit each target weight on ${parseFloat(cash).toFixed(2)} CAD, at today's prices — regardless of zone.</p>
          {HOLDINGS.filter((h) => (h.targetWeightPct ?? 0) > 0).map((h) => {
            const quote = quotes[h.ticker]
            const price = quote?.price ?? null
            const zone = getZone(price, h, quote)
            const targetCAD = parseFloat(cash) * h.targetWeightPct
            const priceCAD = price != null ? price * FX_USD_TO_CAD : null
            const sharesNeeded = priceCAD != null ? Math.floor(targetCAD / priceCAD) : null
            return (
              <div key={h.ticker} className="ref-row">
                <span className={`ticker zone-${zone.color}`}>{h.ticker}</span>
                <span className="ref-pct">{(h.targetWeightPct * 100).toFixed(0)}%</span>
                <span className="ref-cad">${targetCAD.toFixed(2)}</span>
                <span className="ref-shares">{sharesNeeded != null ? `${sharesNeeded} sh` : '—'}</span>
                <span className={`zone-badge zone-${zone.color}`}>{zone.label}</span>
              </div>
            )
          })}
        </div>
      )}

      {plan && (
        <div className="cards">
          {plan.rows.map((row) => {
            const cardColor = row.status === 'beyond' ? 'purple' : row.zone.color
            return (
              <div key={row.ticker} className={`card zone-${cardColor}`}>
                <div className="card-top">
                  <span className={`ticker zone-${cardColor}`}>{row.ticker}</span>
                  <span className="name">{row.name}</span>
                </div>
                <div className="price-row">
                  <span className="price">{row.shares} share{row.shares === 1 ? '' : 's'}</span>
                  <span className={`zone-badge zone-${row.zone.color}`}>{row.zone.label}</span>
                  {row.status === 'beyond' && <span className="zone-badge zone-purple">Beyond target</span>}
                </div>
                <div className="card-footer">
                  <span>${row.cadSpent.toFixed(2)} CAD · {row.pctOfCash.toFixed(1)}% of cash</span>
                </div>
                {row.note && <div className="buy-note">{row.note}</div>}
              </div>
            )
          })}

          <div className="card opportunity-card">
            <div className="card-top">
              <span className="ticker">Opportunity cash</span>
            </div>
            <div className="price-row">
              <span className="price">${plan.opportunityCash.toFixed(2)} CAD</span>
            </div>
            <div className="card-footer">
              <span>Dry powder for core names dropping into 🟢 (e.g. VRT &lt; $240, ANET &lt; $145, CEG &lt; $280)</span>
            </div>
          </div>
        </div>
      )}

      <div className="guardrails">
        <h2>Guardrails</h2>
        Pure math on live prices, current zones, and (if entered) your current
        share counts vs. target weights — not a recommendation to execute.
        Whole shares only; FX is fixed at {FX_USD_TO_CAD} USD/CAD (edit in
        config to update). Verify live price before placing any order in CIBC
        Investor Edge.
      </div>
    </div>
  )
}
