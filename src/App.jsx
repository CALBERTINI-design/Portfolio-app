import { useEffect, useState, useCallback } from 'react'
import { HOLDINGS } from './config/portfolio'
import HoldingCard from './components/HoldingCard'

export default function App() {
  const [quotes, setQuotes] = useState({})
  const [updatedAt, setUpdatedAt] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

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
        <button className="refresh-btn" onClick={fetchPrices} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh prices'}
        </button>
      </div>

      {error && <div className="error-banner">Couldn't load prices: {error}</div>}

      <div className="cards">
        {HOLDINGS.map((holding) => (
          <HoldingCard key={holding.ticker} holding={holding} quote={quotes[holding.ticker]} />
        ))}
      </div>

      <div className="guardrails">
        <h2>Guardrails</h2>
        Target levels are planning guides, not predictions or guarantees. Prices are
        in USD. Informational only, not financial advice. Verify live price before
        placing any order in CIBC Investor Edge.
      </div>
    </>
  )
}
