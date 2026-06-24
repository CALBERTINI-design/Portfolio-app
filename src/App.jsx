import { useEffect, useState, useCallback } from 'react'
import { HOLDINGS, WATCHLIST } from './config/portfolio'
import HoldingCard from './components/HoldingCard'
import BuyMode from './components/BuyMode'
import ThesisMode from './components/ThesisMode'

export default function App() {
  const [quotes, setQuotes] = useState({})
  const [updatedAt, setUpdatedAt] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('price')

  const fetchPrices = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/prices')
      if (!res.ok) throw new Error(`Price API error (${res.status})`)
      const json = await res.json()
      const byTicker = {}
      for (const row of json.data) byTicker[row.ticker] = row
      setQuotes(byTicker)
      setUpdatedAt(json.updatedAt)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPrices()
  }, [fetchPrices])

  return (
    <>
      <div className="header">
        <h1>Infra Portfolio</h1>
        <div className="meta">
          {updatedAt ? `Updated ${new Date(updatedAt).toLocaleTimeString()}` : loading ? 'Loading…' : 'Not loaded'}
        </div>
        <div className="mode-tabs">
          <button className={`tab-btn ${mode === 'price' ? 'active' : ''}`} onClick={() => setMode('price')}>
            Price Check
          </button>
          <button className={`tab-btn ${mode === 'buy' ? 'active' : ''}`} onClick={() => setMode('buy')}>
            Buy Mode
          </button>
          <button className={`tab-btn ${mode === 'thesis' ? 'active' : ''}`} onClick={() => setMode('thesis')}>
            Thesis Review
          </button>
        </div>
        <button className="refresh-btn" onClick={fetchPrices} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh prices'}
        </button>
      </div>

      {error && <div className="error-banner">Couldn't load prices: {error}</div>}

      {mode === 'price' ? (
        <>
          <div className="cards">
            {HOLDINGS.map((holding) => (
              <HoldingCard key={holding.ticker} holding={holding} quote={quotes[holding.ticker]} />
            ))}
          </div>

          {WATCHLIST.length > 0 && (
            <>
              <div className="watchlist-header">Watchlist</div>
              <div className="cards">
                {WATCHLIST.map((holding) => (
                  <HoldingCard key={holding.ticker} holding={holding} quote={quotes[holding.ticker]} watchOnly />
                ))}
              </div>
            </>
          )}

          <div className="guardrails">
            <h2>Guardrails</h2>
            Target levels are planning guides, not predictions or guarantees. Prices are
            in USD. Informational only, not financial advice. Verify live price before
            placing any order in CIBC Investor Edge.
          </div>
        </>
      ) : mode === 'buy' ? (
        <BuyMode quotes={quotes} />
      ) : (
        <ThesisMode />
      )}
    </>
  )
}
