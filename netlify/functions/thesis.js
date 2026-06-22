// Netlify serverless function — Mode 3 (Thesis Review). Manual trigger only.
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
  return items.slice(0, 4).map((n) => ({ ticker, headline: n.headline, summary: n.summary }))
}

export async function handler() {
  const finnhubKey  = process.env.FINNHUB_API_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!finnhubKey)   return { statusCode: 500, body: JSON.stringify({ error: 'FINNHUB_API_KEY not set' }) }
  if (!anthropicKey) return { statusCode: 500, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY not set' }) }

  try {
    const to   = new Date()
    const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000)
    const fromStr = dateStr(from)
    const toStr   = dateStr(to)

    const newsByLayer = {}
    for (const layer of LAYERS) {
      const tickers = HOLDINGS.filter((h) => h.layer === layer).map((h) => h.ticker)
      const results = await Promise.all(tickers.map((t) => fetchNewsForTicker(t, finnhubKey, fromStr, toStr)))
      newsByLayer[layer] = results.flat()
    }

    const layerSections = LAYERS.map((layer) => {
      const tickers  = HOLDINGS.filter((h) => h.layer === layer).map((h) => `${h.ticker} (${h.name})`).join(', ')
      const items    = newsByLayer[layer]
      const newsText = items.length
        ? items.map((n) => `- [${n.ticker}] ${n.headline}${n.summary ? `: ${n.summary}` : ''}`).join('\n')
        : '- No recent news found.'
      return `### ${layer}\nHoldings: ${tickers}\nRecent news:\n${newsText}`
    }).join('\n\n')

    const prompt = `You are reviewing a capex-cycle infrastructure thesis for a long-term (10-year) retail investor in a Canadian TFSA. The investor is 33, accumulation phase only, minimum 3-5 year hold. The thesis: own the infrastructure backbone of AI, electrification, nuclear energy, and automation during the 2026-2032 capex supercycle — not the software layer.

Sell signals should ONLY trigger on genuine thesis breaks — not short-term price drops or noise.

Specific sell criteria per layer:

ETFs (AIPO, SETM):
- AIPO SELL: AI data center capex spending declines YoY, power grid buildout completion signals from major contractors, rate of new data center announcements drops significantly
- SETM SELL: Lithium/copper/uranium spot prices plateau or decline 3+ months, EV adoption growth slows below 15% YoY, major miners cut capex guidance

Nuclear Energy (LEU):
- SELL: SMR project delays exceed 24 months industry-wide, HALEU regulatory monopoly challenged or revoked, DOE contract cancellations

Quantum (IONQ, QBTS, RGTI):
- SELL: No meaningful error correction breakthrough by 2028, major hyperscaler (Google/IBM) publicly abandons quantum program, funding rounds dry up sector-wide

Robotics & Automation (SYM):
- SELL: Warehouse automation adoption stalls, Symbotic loses major customer contracts, next-cycle capex window (2028+) delayed significantly

General triggers (any holding):
- Position up 300%+: flag to take 50% off the table
- 2 consecutive quarters of confirmed declining sector capex spending

For each layer, assess:
1. Overall thesis health: "strengthening", "intact", or "cracks showing"
2. A 2-3 sentence summary citing specific news
3. Per holding: sell signal — "hold" (accumulate), "watch" (early warning), "reduce" (consider trimming), "exit" (thesis broken)

${layerSections}

Respond ONLY with a JSON array, one object per layer:
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
    const text       = claudeJson.content?.[0]?.text ?? '[]'
    const jsonMatch  = text.match(/\[[\s\S]*\]/)
    const layers     = jsonMatch ? JSON.parse(jsonMatch[0]) : []

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updatedAt: new Date().toISOString(), layers, newsByLayer }),
    }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
