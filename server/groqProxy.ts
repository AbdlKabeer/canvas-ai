import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { Readable } from 'node:stream'

/**
 * Dev/preview middleware: browser calls /groq/*, we forward to Groq with an API key
 * taken from server-side env. Keys never reach the client bundle. On 429 we try the next key.
 */
export function groqProxy(keys: string[], upstream = 'https://api.groq.com/openai/v1'): Plugin {
  const handler = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (!req.url?.startsWith('/groq/')) return next()
    if (keys.length === 0) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: { message: 'GROQ_API_KEYS is not set. Add it to .env and restart the dev server.' } }))
      return
    }

    const chunks: Buffer[] = []
    for await (const c of req) chunks.push(c as Buffer)
    const body = chunks.length ? Buffer.concat(chunks) : undefined

    const abort = new AbortController()
    res.on('close', () => abort.abort())

    const shuffled = [...keys].sort(() => Math.random() - 0.5)
    let last: Response | null = null
    try {
      for (const key of shuffled) {
        const r = await fetch(upstream + req.url!.slice('/groq'.length), {
          method: req.method,
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
          signal: abort.signal,
        })
        if (r.status === 429) {
          last = r
          continue
        }
        return await pipe(r, res)
      }
      if (last) return await pipe(last, res)
    } catch (e) {
      if (abort.signal.aborted) return
      res.statusCode = 502
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: { message: `Could not reach Groq: ${(e as Error).message}` } }))
    }
  }

  return {
    name: 'groq-proxy',
    configureServer: (s) => void s.middlewares.use(handler),
    configurePreviewServer: (s) => void s.middlewares.use(handler),
  }
}

async function pipe(r: Response, res: ServerResponse) {
  res.statusCode = r.status
  const type = r.headers.get('content-type')
  if (type) res.setHeader('Content-Type', type)
  res.setHeader('Cache-Control', 'no-cache')
  if (!r.body) return res.end()
  Readable.fromWeb(r.body as never).pipe(res)
}
