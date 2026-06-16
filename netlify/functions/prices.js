// Netlify serverless function — proxies Finnhub so the API key stays server-side.
const TICKERS = ['AIPO', 'IONQ', 'QBTS', 'RGTI', 'SYM', 'TER', 'CBRS']

async function safeJson(res) {
  if (!res.ok) return null
  try {
    return await res.json()
  } catch {
    return null
  }
}

// Average earnings surprise % over the last 4 reported quarters — a rough
// proxy for whether the business is executing, relevant to a multi-year thesis.
async function fetchEarningsTrend(ticker, key) {
  const res = await fetch(`https://finnhub.io/api/v1/stock/earnings?symbol=${ticker}&token=${key}`)
  const data = await safeJson(res)
  if (!Array.isArray(data) || data.length === 0) return null

  const recent = data.slice(0, 4).filter((q) => typeof q.surprisePercent === 'number')
  if (recent.length === 0) return null

  const avg = recent.reduce((sum, q) => sum + q.surprisePercent, 0) / recent.length
  return { avgSurprisePct: avg, quarters: recent.length }
}

// How the stock's daily move compares to its closest peers — a short-term
// sector-strength signal, shown alongside the longer-term earnings trend.
async function fetchSectorStrength(ticker, ownChange, key) {
  const peersRes = await fetch(`https://finnhub.io/api/v1/stock/peers?symbol=${ticker}&token=${key}`)
  const peers = await safeJson(peersRes)
  if (!Array.isArray(peers)) return null

  const peerTickers = peers.filter((p) => p !== ticker).slice(0, 3)
  if (peerTickers.length === 0 || ownChange == null) return null

  const peerQuotes = await Promise.all(
    peerTickers.map((p) => fetch(`https://finnhub.io/api/v1/quote?symbol=${p}&token=${key}`).then(safeJson))
  )
  const peerChanges = peerQuotes.map((q) => q?.dp).filter((dp) => typeof dp === 'number')
  if (peerChanges.length === 0) return null

  const peerAvg = peerChanges.reduce((sum, dp) => sum + dp, 0) / peerChanges.length
  return { relativeStrength: ownChange - peerAvg, peerCount: peerChanges.length }
}

export async function handler() {
  const key = process.env.FINNHUB_API_KEY
  if (!key) {
    return { statusCode: 500, body: JSON.stringify({ error: 'FINNHUB_API_KEY not set' }) }
  }

  try {
    const results = await Promise.all(
      TICKERS.map(async (ticker) => {
        const [quoteRes, metricRes, targetRes] = await Promise.all([
          fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${key}`),
          fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${ticker}&metric=all&token=${key}`),
          fetch(`https://finnhub.io/api/v1/stock/price-target?symbol=${ticker}&token=${key}`),
        ])

        const quote = await quoteRes.json()
        const metric = await metricRes.json()
        const target = targetRes.ok ? await targetRes.json() : {}

        const [earningsTrend, sectorStrength] = await Promise.all([
          fetchEarningsTrend(ticker, key),
          fetchSectorStrength(ticker, quote.dp ?? null, key),
        ])

        return {
          ticker,
          price: quote.c ?? null,
          change: quote.dp ?? null,
          weekHigh52: metric?.metric?.['52WeekHigh'] ?? null,
          weekLow52: metric?.metric?.['52WeekLow'] ?? null,
          analystTarget: target?.targetMean ?? null,
          earningsTrend,
          sectorStrength,
        }
      })
    )

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=60' },
      body: JSON.stringify({ updatedAt: new Date().toISOString(), data: results }),
    }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
