import { useState } from 'react'
import { HOLDINGS } from '../config/portfolio'

const HEALTH_COLOR = {
  strengthening: 'green',
  intact: 'yellow',
  'cracks showing': 'red',
}

export default function ThesisMode() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const runReview = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/thesis')
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Error ${res.status}`)
      }
      const json = await res.json()
      setResult(json)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="thesis-mode">
      <div className="thesis-intro">
        <p>
          Pulls recent news per thesis layer and asks Claude whether each part
          of the infrastructure thesis is strengthening, intact, or showing
          cracks. This is the only mode that costs an LLM call — runs only
          when you tap the button below.
        </p>
        <button className="refresh-btn" onClick={runReview} disabled={loading}>
          {loading ? 'Reviewing… (this can take ~30s)' : 'Run Thesis Review'}
        </button>
      </div>

      {error && <div className="error-banner">Couldn't run review: {error}</div>}

      {result && (
        <>
          <div className="meta thesis-updated">Reviewed {new Date(result.updatedAt).toLocaleString()}</div>
          <div className="cards">
            {result.layers.map((layer) => {
              const color = HEALTH_COLOR[layer.health] ?? 'unknown'
              return (
                <div key={layer.layer} className={`card zone-${color}`}>
                  <div className="card-top">
                    <span className={`ticker zone-${color}`}>{layer.layer}</span>
                    <span className="name">
                      {HOLDINGS.filter((h) => h.layer === layer.layer).map((h) => h.ticker).join(', ')}
                    </span>
                    <span className={`zone-badge zone-${color}`}>{layer.health}</span>
                  </div>
                  <p className="thesis-summary">{layer.summary}</p>
                </div>
              )
            })}
          </div>
        </>
      )}

      <div className="guardrails">
        <h2>Guardrails</h2>
        This read is only as good as the news fed to it (last 7 days, per
        holding) — it's not a replacement for deliberate human review at major
        inflection points. Informational only, not financial advice.
      </div>
    </div>
  )
}
