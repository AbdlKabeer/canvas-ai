import { SYSTEM_PROMPT, USER_PROMPT } from '../prompt'
import { getJson, postStream, proxy, readSse } from './http'
import type { Provider } from './types'

const LABEL = 'Google'
const base = proxy('google')

export const google: Provider = {
  id: 'google',
  async listModels(signal) {
    const data = await getJson<{ models: { name: string; supportedGenerationMethods?: string[] }[] }>(
      LABEL,
      `${base}/models?pageSize=200`,
      signal
    )
    return data.models
      .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m) => m.name.replace(/^models\//, ''))
      .filter((id) => id.startsWith('gemini') && !/embedding|tts|image|live|audio/.test(id))
      .sort()
  },
  async generate({ imageBase64, model, signal, onToken }) {
    const res = await postStream(LABEL, `${base}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`, {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [
        {
          role: 'user',
          parts: [{ text: USER_PROMPT }, { inlineData: { mimeType: 'image/png', data: imageBase64 } }],
        },
      ],
      generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
    }, signal)

    let text = ''
    await readSse(res, (data) => {
      const chunk = JSON.parse(data) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[]
        error?: { message?: string }
      }
      if (chunk.error) throw new Error(`${LABEL}: ${chunk.error.message ?? 'stream error'}`)
      const piece = chunk.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
      if (piece) onToken((text += piece))
    })
    return text
  },
}
