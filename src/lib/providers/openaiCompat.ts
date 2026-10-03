import { SYSTEM_PROMPT, USER_PROMPT } from '../prompt'
import { getJson, postStream, proxy, readSse } from './http'
import type { Provider } from './types'

/** Groq and OpenAI share the chat-completions wire format. */
export function openaiCompat(opts: {
  id: string
  label: string
  include: RegExp
  exclude?: RegExp
  preferred?: string[]
  tokensParam: 'max_tokens' | 'max_completion_tokens'
  temperature?: number
}): Provider {
  const base = proxy(opts.id)
  return {
    id: opts.id,
    async listModels(signal) {
      const data = await getJson<{ data: { id: string }[] }>(opts.label, `${base}/models`, signal)
      const ids = data.data
        .map((m) => m.id)
        .filter((id) => opts.include.test(id) && !opts.exclude?.test(id))
        .sort()
      const pref = (opts.preferred ?? []).filter((p) => ids.includes(p))
      return [...pref, ...ids.filter((id) => !pref.includes(id))]
    },
    async generate({ imageBase64, model, signal, onToken }) {
      const res = await postStream(opts.label, `${base}/chat/completions`, {
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: USER_PROMPT },
              { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } },
            ],
          },
        ],
        stream: true,
        [opts.tokensParam]: 4096,
        ...(opts.temperature !== undefined && { temperature: opts.temperature }),
      }, signal)

      let text = ''
      await readSse(res, (data) => {
        if (data === '[DONE]') return
        const chunk = JSON.parse(data) as { choices?: { delta?: { content?: string } }[]; error?: { message?: string } }
        if (chunk.error) throw new Error(`${opts.label}: ${chunk.error.message ?? 'stream error'}`)
        const content = chunk.choices?.[0]?.delta?.content
        if (content) onToken((text += content))
      })
      return text
    },
  }
}
