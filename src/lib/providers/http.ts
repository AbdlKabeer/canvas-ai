export const proxy = (id: string) => `/ai/${id}`

export async function errorMessage(label: string, res: Response): Promise<string> {
  const text = await res.text().catch(() => '')
  try {
    const j = JSON.parse(text)
    const msg = j?.error?.message ?? j?.error
    if (typeof msg === 'string' && msg) return `${label} ${res.status}: ${msg}`
  } catch {
    /* not JSON */
  }
  return `${label} ${res.status}: ${text || 'request failed'}`
}

export async function getJson<T>(label: string, url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(await errorMessage(label, res))
  return (await res.json()) as T
}

/** Streams the response, calling onData with the payload of each SSE `data:` line. */
export async function readSse(res: Response, onData: (data: string) => void) {
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const raw of lines) {
      const line = raw.trim()
      if (line.startsWith('data:')) onData(line.slice(5).trim())
    }
  }
}

/** Shared request wrapper: POST JSON, surface rate limits and errors, return the response for streaming. */
export async function postStream(label: string, url: string, body: unknown, signal?: AbortSignal) {
  const res = await fetch(url, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (res.status === 429) throw new Error(`${label} rate limit reached on all configured keys. Try again shortly.`)
  if (!res.ok || !res.body) throw new Error(await errorMessage(label, res))
  return res
}
