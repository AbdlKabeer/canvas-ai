export const OLLAMA_BASE = '/ollama'
export const DEFAULT_MODEL = 'qwen2.5vl:7b'

export const SYSTEM_PROMPT = `You are an expert UI engineer. The image is a rough hand-drawn wireframe.
Recreate it as a single self-contained HTML snippet styled ONLY with Tailwind CSS utility classes.
Rules:
- Return ONLY the HTML inside one \`\`\`html code block. No explanation.
- No <html>, <head>, <body>, <script>, or external resources/images.
- Use the text, layout and hierarchy visible in the sketch; polish spacing, colors and typography.
- Make the root element fill the available width.`

export async function listModels(signal?: AbortSignal): Promise<string[]> {
  const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal })
  if (!res.ok) throw new Error(`Ollama /api/tags failed (${res.status})`)
  const data = (await res.json()) as { models: { name: string }[] }
  return data.models.map((m) => m.name)
}

/** Streams a vision generation; calls onToken with the accumulated text. */
export async function generateFromImage(opts: {
  imageBase64: string
  model: string
  signal?: AbortSignal
  onToken: (accumulated: string) => void
}): Promise<string> {
  const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: 'POST',
    signal: opts.signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: opts.model,
      system: SYSTEM_PROMPT,
      prompt: 'Convert this wireframe into HTML with Tailwind CSS.',
      images: [opts.imageBase64],
      stream: true,
      options: { temperature: 0.2, num_predict: 4096 },
    }),
  })
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Ollama error ${res.status}: ${detail || 'is it running and is the model pulled?'}`)
  }

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
    for (const line of lines) {
      if (!line.trim()) continue
      const chunk = JSON.parse(line) as { response?: string; error?: string }
      if (chunk.error) throw new Error(chunk.error)
      if (chunk.response) {
        text += chunk.response
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
