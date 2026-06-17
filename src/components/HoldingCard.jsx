import { getZone } from '../config/portfolio'

export default function HoldingCard({ holding, quote }) {
  const price = quote?.price ?? null
  const zone = getZone(price, holding, quote)
  const low = quote?.weekLow52 ?? null
  const high = quote?.weekHigh52 ?? null

  let fillPct = null
  if (low != null && high != null && high > low) {
    const clampedPrice = Math.min(Math.max(price, low), high)
    fillPct = ((clampedPrice - low) / (high - low)) * 100
  }

  const change = quote?.change ?? null

  const target = quote?.analystTarget ?? null
  const upsidePct = price != null && target != null ? ((target - price) / price) * 100 : null

  const notes = []
  if (upsidePct != null) {
    if (upsidePct >= 15) {
      notes.push({ type: 'support', text: `📈 Analyst target +${upsidePct.toFixed(0)}% — momentum supported even at this level` })
    } else if (upsidePct <= 5 && fillPct != null && fillPct >= 70) {
      notes.push({ type: 'stretch', text: `⚠️ Near 52wk high with limited analyst upside (+${upsidePct.toFixed(0)}%) — zone may be stretched` })
    }
  }

  const earnings = quote?.earningsTrend
  if (earnings != null) {
    if (earnings.avgSurprisePct > 0) {
      notes.push({ type: 'support', text: `📊 Beating earnings estimates (avg +${earnings.avgSurprisePct.toFixed(1)}% over ${earnings.quarters}q) — supports long-term thesis` })
    } else if (earnings.avgSurprisePct < 0) {
      notes.push({ type: 'stretch', text: `📊 Missing earnings estimates (avg ${earnings.avgSurprisePct.toFixed(1)}% over ${earnings.quarters}q) — watch execution` })
    }
  }

  const sector = quote?.sectorStrength
  if (sector != null && Math.abs(sector.relativeStrength) >= 1) {
    if (sector.relativeStrength > 0) {
      notes.push({ type: 'support', text: `🏭 Outperforming ${sector.peerCount} sector peers today (+${sector.relativeStrength.toFixed(1)} pts)` })
    } else {
      notes.push({ type: 'stretch', text: `🏭 Underperforming ${sector.peerCount} sector peers today (${sector.relativeStrength.toFixed(1)} pts)` })
    }
  }

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
        <span>Score {zone.score ?? '—'}/10</span>
        {quote?.analystTarget != null && <span>Target ${quote.analystTarget.toFixed(0)}</span>}
      </div>

      {notes.map((note, i) => (
        <div key={i} className={`momentum-note ${note.type}`}>{note.text}</div>
      ))}
    </div>
  )
}
