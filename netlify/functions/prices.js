// Netlify serverless function — proxies Finnhub so the API key stays server-side.
const TICKERS = ['AIPO', 'SETM', 'LEU', 'IONQ', 'QBTS', 'RGTI', 'SYM']

async function safeJson(res) {
  if (!res.ok) return null
  try {
    return await res.json()
  } catch {
    return null
  }
}

async function fetchEarningsTrend(ticker, key) {
  const res = await fetch(`https://finnhub.io/api/v1/stock/earnings?symbol=${ticker}&token=${key}`)
  const data = await safeJson(res)
  if (!Array.isArray(data) || data.length === 0) return null

  const recent = data.slice(0, 4).filter((q) => typeof q.surprisePercent === 'number')
  if (recent.length === 0) return null

  const avg = recent.reduce((sum, q) => sum + q.surprisePercent, 0) / recent.length
  return { avgSurprisePct: avg, quarters: recent.length }
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

        const quote  = await quoteRes.json()
        const metric = await metricRes.json()
        const target = targetRes.ok ? await targetRes.json() : {}

        const earningsTrend = await fetchEarningsTrend(ticker, key)

        return {
          ticker,
          price:        quote.c   ?? null,
          change:       quote.dp  ?? null,
          weekHigh52:   metric?.metric?.['52WeekHigh'] ?? null,
          weekLow52:    metric?.metric?.['52WeekLow']  ?? null,
          analystTarget: target?.targetMean ?? null,
          earningsTrend,
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
