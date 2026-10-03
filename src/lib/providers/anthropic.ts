import { SYSTEM_PROMPT, USER_PROMPT } from '../prompt'
import { getJson, postStream, proxy, readSse } from './http'
import type { Provider } from './types'

const LABEL = 'Anthropic'
const base = proxy('anthropic')

export const anthropic: Provider = {
  id: 'anthropic',
  async listModels(signal) {
    const data = await getJson<{ data: { id: string }[] }>(LABEL, `${base}/models?limit=100`, signal)
    return data.data.map((m) => m.id).filter((id) => id.startsWith('claude'))
  },
  async generate({ imageBase64, model, signal, onToken }) {
    const res = await postStream(LABEL, `${base}/messages`, {
      model,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      stream: true,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/png', data: imageBase64 } },
            { type: 'text', text: USER_PROMPT },
          ],
        },
      ],
    }, signal)

    let text = ''
    await readSse(res, (data) => {
      const ev = JSON.parse(data) as {
        type: string
        delta?: { type?: string; text?: string }
        error?: { message?: string }
      }
      if (ev.type === 'error') throw new Error(`${LABEL}: ${ev.error?.message ?? 'stream error'}`)
      if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta' && ev.delta.text) {
        onToken((text += ev.delta.text))
      }
    })
    return text
  },
}
