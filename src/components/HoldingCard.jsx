import { getZone } from '../config/portfolio'

export default function HoldingCard({ holding, quote }) {
  const price = quote?.price ?? null
  const zone = getZone(price, holding)
  const low = quote?.weekLow52 ?? null
  const high = quote?.weekHigh52 ?? null

  let fillPct = null
  let aggPct = null
  let safePct = null
  if (low != null && high != null && high > low) {
    const clampedPrice = Math.min(Math.max(price, low), high)
    fillPct = ((clampedPrice - low) / (high - low)) * 100
    aggPct = ((holding.aggressive - low) / (high - low)) * 100
    safePct = ((holding.safe - low) / (high - low)) * 100
    aggPct = Math.min(Math.max(aggPct, 0), 100)
    safePct = Math.min(Math.max(safePct, 0), 100)
  }

  const change = quote?.change ?? null

  return (
    <div className={`card zone-${zone.color}`}>
      <div className="card-top">
        <span className={`ticker zone-${zone.color}`}>{holding.ticker}</span>
        <span className="name">{holding.name}</span>
      </div>

      <div className="price-row">
        <span className="price">{price != null ? `$${price.toFixed(2)}` : '—'}</span>
        {change != null && (
          <span className={`change ${change >= 0 ? 'pos' : 'neg'}`}>
            {change >= 0 ? '+' : ''}{change.toFixed(2)}%
          </span>
        )}
        <span className={`zone-badge zone-${zone.color}`}>{zone.label}</span>
      </div>

      <div className="range-bar">
        {aggPct != null && (
          <div
            className="range-zone"
            style={{ left: 0, width: `${aggPct}%`, background: 'rgba(62,199,122,0.25)' }}
          />
        )}
        {aggPct != null && safePct != null && (
          <div
            className="range-zone"
            style={{ left: `${aggPct}%`, width: `${Math.max(safePct - aggPct, 0)}%`, background: 'rgba(231,184,75,0.25)' }}
          />
        )}
        {fillPct != null && (
          <div className="range-fill" style={{ left: `${fillPct}%` }} />
        )}
      </div>
      <div className="range-labels">
        <span>{low != null ? `$${low.toFixed(0)}` : '—'}</span>
        <span>52wk range</span>
        <span>{high != null ? `$${high.toFixed(0)}` : '—'}</span>
      </div>

      <div className="card-footer">
        <span>Agg ≤ ${holding.aggressive} · Safe ≤ ${holding.safe}</span>
        {quote?.analystTarget != null && <span>Target ${quote.analystTarget.toFixed(0)}</span>}
      </div>
    </div>
  )
}
