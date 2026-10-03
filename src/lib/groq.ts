// Browser talks to /groq/* (see server/groqProxy.ts), which adds the API key server-side.
const BASE = '/groq'

export const DEFAULT_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'

export const SYSTEM_PROMPT = `You are an expert UI engineer. The image is a rough hand-drawn wireframe.
Recreate it as a single self-contained HTML snippet styled ONLY with Tailwind CSS utility classes.
Rules:
- Return ONLY the HTML inside one \`\`\`html code block. No explanation.
- No <html>, <head>, <body>, <script>, or external resources/images.
- Use the text, layout and hierarchy visible in the sketch; polish spacing, colors and typography.
- Make the root element fill the available width.`

// Groq's /models has no capability flag, so pick likely vision models by name.
const VISION_HINT = /vision|llama-4|scout|maverick|pixtral|-vl/i

async function errorMessage(res: Response): Promise<string> {
  const text = await res.text().catch(() => '')
  try {
    const msg = JSON.parse(text)?.error?.message
    if (msg) return `Groq ${res.status}: ${msg}`
  } catch {
    /* not JSON */
  }
  return `Groq ${res.status}: ${text || 'request failed'}`
}

export async function listModels(signal?: AbortSignal): Promise<string[]> {
  const res = await fetch(`${BASE}/models`, { signal })
  if (!res.ok) throw new Error(await errorMessage(res))
  const data = (await res.json()) as { data: { id: string }[] }
  return data.data.map((m) => m.id).filter((id) => VISION_HINT.test(id)).sort()
}

/** Streams a vision generation; calls onToken with the accumulated text. */
export async function generateFromImage(opts: {
  imageBase64: string
  model: string
  signal?: AbortSignal
  onToken: (accumulated: string) => void
}): Promise<string> {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    signal: opts.signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: opts.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Convert this wireframe into HTML with Tailwind CSS.' },
            { type: 'image_url', image_url: { url: `data:image/png;base64,${opts.imageBase64}` } },
          ],
        },
      ],
      stream: true,
      temperature: 0.2,
      max_tokens: 4096,
    }),
  })
  if (res.status === 429) throw new Error('Groq rate limit reached on all configured keys. Try again shortly.')
  if (!res.ok || !res.body) throw new Error(await errorMessage(res))

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let text = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const raw of lines) {
      const line = raw.trim()
      if (!line.startsWith('data:')) continue
      const data = line.slice(5).trim()
      if (data === '[DONE]') continue
      const chunk = JSON.parse(data) as { choices?: { delta?: { content?: string } }[]; error?: { message?: string } }
      if (chunk.error) throw new Error(`Groq: ${chunk.error.message ?? 'stream error'}`)
      const content = chunk.choices?.[0]?.delta?.content
      if (content) {
        text += content
        opts.onToken(text)
      }
    }
  }
  return text
}

/** Pulls HTML out of a (possibly still-streaming) markdown code fence. */
export function extractHtml(raw: string): string {
  const fenced = raw.match(/```(?:html)?\s*\n([\s\S]*?)(?:```|$)/i)
  return (fenced ? fenced[1] : raw).trim()
}
