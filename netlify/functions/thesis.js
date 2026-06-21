// Netlify serverless function — Mode 3 (Thesis Review).
// Manually triggered only. Pulls recent news per thesis layer from Finnhub,
// then calls the Claude API to assess thesis health per layer.
import { HOLDINGS } from '../../src/config/portfolio.js'

const LAYERS = [...new Set(HOLDINGS.map((h) => h.layer))]

function dateStr(d) {
  return d.toISOString().slice(0, 10)
}

async function fetchNewsForTicker(ticker, finnhubKey, from, to) {
  const url = `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${from}&to=${to}&token=${finnhubKey}`
  const res = await fetch(url)
  if (!res.ok) return []
  const items = await res.json()
  return items.slice(0, 4).map((n) => ({ ticker, headline: n.headline, summary: n.summary, source: n.source, url: n.url }))
}

export async function handler() {
  const finnhubKey = process.env.FINNHUB_API_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!finnhubKey) return { statusCode: 500, body: JSON.stringify({ error: 'FINNHUB_API_KEY not set' }) }
  if (!anthropicKey) return { statusCode: 500, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY not set' }) }

  try {
    const to = new Date()
    const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000)
    const fromStr = dateStr(from)
    const toStr = dateStr(to)

    const newsByLayer = {}
    for (const layer of LAYERS) {
      const tickers = HOLDINGS.filter((h) => h.layer === layer).map((h) => h.ticker)
      const results = await Promise.all(tickers.map((t) => fetchNewsForTicker(t, finnhubKey, fromStr, toStr)))
      newsByLayer[layer] = results.flat()
    }

    const layerSections = LAYERS.map((layer) => {
      const tickers = HOLDINGS.filter((h) => h.layer === layer).map((h) => `${h.ticker} (${h.name})`).join(', ')
      const items = newsByLayer[layer]
      const newsText = items.length
        ? items.map((n) => `- [${n.ticker}] ${n.headline}${n.summary ? `: ${n.summary}` : ''}`).join('\n')
        : '- No recent news found.'
      return `### ${layer}\nHoldings: ${tickers}\nRecent news:\n${newsText}`
    }).join('\n\n')

    const prompt = `You are reviewing an infrastructure-investing thesis for a long-term (10-year) retail investor in a Canadian TFSA. The thesis: own the infrastructure backbone of AI, electrification, and automation (power, grid, cooling, networking, robotics, compute) rather than betting on which AI software company wins. The investor does NOT sell within 3-5 years minimum — sell signals should only trigger on genuine thesis breaks, not short-term volatility or price drops alone.

For each of the following thesis layers, using the recent news provided, assess:
1. Overall thesis health for that layer: "strengthening", "intact", or "cracks showing"
2. A 2-3 sentence summary of what's helping or hurting the thesis, citing specific news where relevant
3. For each individual holding in the layer, a sell signal:
   - "hold" — thesis intact, continue accumulating
   - "watch" — early warning signs, monitor closely but no action yet
   - "reduce" — thesis weakening for this specific name, consider trimming
   - "exit" — thesis broken for this name, genuine reason to sell regardless of price

${layerSections}

Respond ONLY with a JSON array, one object per layer, in this exact shape:
[{
  "layer": "...",
  "health": "strengthening|intact|cracks showing",
  "summary": "...",
  "holdings": [
    {"ticker": "...", "sellSignal": "hold|watch|reduce|exit", "sellNote": "one sentence reason"}
  ]
}]`

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      return { statusCode: 500, body: JSON.stringify({ error: `Claude API error: ${errText}` }) }
    }

    const claudeJson = await claudeRes.json()
    const text = claudeJson.content?.[0]?.text ?? '[]'
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    const layerAssessments = jsonMatch ? JSON.parse(jsonMatch[0]) : []

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updatedAt: new Date().toISOString(),
        layers: layerAssessments,
        newsByLayer,
      }),
    }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
