import { useState } from 'react'
import { FX_USD_TO_CAD } from '../config/portfolio'
import { computeBuyPlan } from '../config/allocate'

export default function BuyMode({ quotes }) {
  const [cash, setCash] = useState('')
  const [plan, setPlan] = useState(null)

  const handleCalculate = () => {
    const cashCAD = parseFloat(cash)
    if (!cashCAD || cashCAD <= 0) return
    setPlan(computeBuyPlan(cashCAD, FX_USD_TO_CAD, quotes))
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

      {plan && (
        <div className="cards">
          {plan.rows.map((row) => (
            <div key={row.ticker} className={`card zone-${row.zone.color}`}>
              <div className="card-top">
                <span className={`ticker zone-${row.zone.color}`}>{row.ticker}</span>
                <span className="name">{row.name}</span>
              </div>
              <div className="price-row">
                <span className="price">{row.shares} share{row.shares === 1 ? '' : 's'}</span>
                <span className={`zone-badge zone-${row.zone.color}`}>{row.zone.label}</span>
              </div>
              <div className="card-footer">
                <span>${row.cadSpent.toFixed(2)} CAD · {row.pctOfCash.toFixed(1)}% of cash</span>
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
              <span>Dry powder for core names dropping into 🟢 (e.g. VRT &lt; $240, ANET &lt; $145, CEG &lt; $280)</span>
            </div>
          </div>
        </div>
      )}

      <div className="guardrails">
        <h2>Guardrails</h2>
        Pure math on live prices and current zones — not a recommendation to
        execute. Whole shares only; FX is fixed at {FX_USD_TO_CAD} USD/CAD
        (edit in config to update). Verify live price before placing any order
        in CIBC Investor Edge.
      </div>
    </div>
  )
}
