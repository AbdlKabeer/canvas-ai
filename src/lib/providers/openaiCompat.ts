import { SYSTEM_PROMPT, USER_PROMPT } from '../prompt'
import { getJson, postStream, proxy, readSse } from './http'
import type { Provider } from './types'

const NON_CHAT = /whisper|tts|guard|orpheus|embed|moderation|transcribe|dall-e/i

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
      const usable = data.data
        .map((m) => m.id)
        .filter((id) => !opts.exclude?.test(id) && !NON_CHAT.test(id))
        .sort()
      // The name filter is a guess at vision support; if it matches nothing, show every chat model
      // rather than an empty dropdown (the user can still try one).
      const matched = usable.filter((id) => opts.include.test(id))
      const ids = matched.length ? matched : usable
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
