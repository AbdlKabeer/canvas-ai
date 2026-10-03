export const DEFAULT_MODEL = 'llama-3.2-11b-vision-preview'

export const SYSTEM_PROMPT = `You are an expert UI engineer. The image is a rough hand-drawn wireframe.
Recreate it as a single self-contained HTML snippet styled ONLY with Tailwind CSS utility classes.
Rules:
- Return ONLY the HTML inside one \`\`\`html code block. No explanation.
- No <html>, <head>, <body>, <script>, or external resources/images.
- Use the text, layout and hierarchy visible in the sketch; polish spacing, colors and typography.
- Make the root element fill the available width.`

export async function listModels(signal?: AbortSignal): Promise<string[]> {
  // Groq's vision models
  return [
    'llama-3.2-90b-vision-preview',
    'llama-3.2-11b-vision-preview'
  ]
}

/** Streams a vision generation; calls onToken with the accumulated text. */
export async function generateFromImage(opts: {
  imageBase64: string
  model: string
  signal?: AbortSignal
  onToken: (accumulated: string) => void
}): Promise<string> {
  const keysStr = import.meta.env.VITE_GROQ_API_KEYS || import.meta.env.VITE_GROQ_API_KEY;
  if (!keysStr) {
    throw new Error("Please set VITE_GROQ_API_KEYS (comma separated) in your .env file and restart the dev server.");
  }
  const apiKeys = keysStr.split(',').map((k: string) => k.trim()).filter(Boolean);
  
  // Shuffle keys to distribute load
  const shuffledKeys = [...apiKeys].sort(() => Math.random() - 0.5);
  let lastError: Error | null = null;

  for (const apiKey of shuffledKeys) {
    try {
      const res = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
        method: 'POST',
        signal: opts.signal,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: opts.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { 
              role: 'user', 
              content: [
                { type: 'text', text: 'Convert this wireframe into HTML with Tailwind CSS.' },
                { type: 'image_url', image_url: { url: `data:image/png;base64,${opts.imageBase64}` } }
              ]
            }
          ],
          stream: true,
          temperature: 0.2,
          max_tokens: 4096,
        }),
      })
      
      if (!res.ok || !res.body) {
        if (res.status === 429) {
          throw new Error('RATE_LIMIT');
        }
        const detail = await res.text().catch(() => '')
        throw new Error(`Groq error ${res.status}: ${detail || 'Check your API key and network connection.'}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let text = ''
      let buffer = ''
      
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        
        let boundary = buffer.indexOf('\n')
        while (boundary !== -1) {
          const line = buffer.slice(0, boundary).trim()
          buffer = buffer.slice(boundary + 1)
          boundary = buffer.indexOf('\n')
          
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content
              if (content) {
                text += content
                opts.onToken(text)
              }
            } catch(e) {
              // ignore parsing errors for partial chunks
            }
          }
        }
      }
      return text;
    } catch (e: any) {
      if (e.message === 'RATE_LIMIT') {
        lastError = new Error('Rate limited on all provided Groq API keys.');
        continue;
      }
      throw e;
    }
  }
  
  throw lastError || new Error("Failed to generate with any API key.");
}

/** Pulls HTML out of a (possibly still-streaming) markdown code fence. */
export function extractHtml(raw: string): string {
  const fenced = raw.match(/```(?:html)?\s*\n([\s\S]*?)(?:```|$)/i)
  return (fenced ? fenced[1] : raw).trim()
}
