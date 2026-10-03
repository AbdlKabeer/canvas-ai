import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { Readable } from 'node:stream'

export interface ProviderConfig {
  id: string
  label: string
  baseUrl: string
  keys: string[]
  headers: (key: string) => Record<string, string>
}

const DEFS: Omit<ProviderConfig, 'keys'>[] = [
  { id: 'groq', label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', headers: (k) => ({ Authorization: `Bearer ${k}` }) },
  { id: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', headers: (k) => ({ Authorization: `Bearer ${k}` }) },
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    baseUrl: 'https://api.anthropic.com/v1',
    headers: (k) => ({ 'x-api-key': k, 'anthropic-version': '2023-06-01' }),
  },
  {
    id: 'google',
    label: 'Google (Gemini)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    headers: (k) => ({ 'x-goog-api-key': k }),
  },
]

/** Keys come from `<ID>_API_KEYS` (comma-separated); `<ID>_BASE_URL` overrides the upstream. Server-side only. */
export function providersFromEnv(env: Record<string, string | undefined>): ProviderConfig[] {
  return DEFS.map((d) => {
    const ID = d.id.toUpperCase()
    const keys = (env[`${ID}_API_KEYS`] ?? '').split(',').map((k) => k.trim()).filter(Boolean)
    return { ...d, baseUrl: env[`${ID}_BASE_URL`] || d.baseUrl, keys }
  })
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

/**
 * Dev/preview middleware. Browser calls /ai/<provider>/*; we forward upstream with a server-side
 * key (never in the client bundle) and try the next key on HTTP 429. GET /ai/providers lists
 * the providers that have keys configured.
 */
export function aiProxy(providers: ProviderConfig[]): Plugin {
  const handler = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url ?? ''
    if (!url.startsWith('/ai/')) return next()

    if (url === '/ai/providers') {
      return json(res, 200, providers.filter((p) => p.keys.length).map(({ id, label }) => ({ id, label })))
    }

    const m = url.match(/^\/ai\/([a-z]+)(\/.*)$/)
    const provider = m && providers.find((p) => p.id === m[1])
    if (!provider || !m) return json(res, 404, { error: { message: 'Unknown provider' } })
    if (provider.keys.length === 0) {
      return json(res, 500, {
        error: { message: `${provider.id.toUpperCase()}_API_KEYS is not set. Add it to .env and restart the dev server.` },
      })
    }

    const chunks: Buffer[] = []
    for await (const c of req) chunks.push(c as Buffer)
    const body = chunks.length ? Buffer.concat(chunks) : undefined
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD'

    const abort = new AbortController()
    res.on('close', () => abort.abort())

    let last: Response | null = null
    try {
      for (const key of [...provider.keys].sort(() => Math.random() - 0.5)) {
        const r = await fetch(provider.baseUrl + m[2], {
          method: req.method,
          headers: { 'Content-Type': 'application/json', ...provider.headers(key) },
          body: hasBody ? body : undefined,
          signal: abort.signal,
        })
        if (r.status === 429) {
          last = r
          continue
        }
        return pipe(r, res)
      }
      if (last) return pipe(last, res)
    } catch (e) {
      if (abort.signal.aborted) return
      json(res, 502, { error: { message: `Could not reach ${provider.label}: ${(e as Error).message}` } })
    }
  }

  return {
    name: 'ai-proxy',
    configureServer: (s) => void s.middlewares.use(handler),
    configurePreviewServer: (s) => void s.middlewares.use(handler),
  }
}

function pipe(r: Response, res: ServerResponse) {
  res.statusCode = r.status
  const type = r.headers.get('content-type')
  if (type) res.setHeader('Content-Type', type)
  res.setHeader('Cache-Control', 'no-cache')
  if (!r.body) return void res.end()
  Readable.fromWeb(r.body as never).pipe(res)
}
