import { anthropic } from './anthropic'
import { google } from './google'
import { openaiCompat } from './openaiCompat'
import type { Provider } from './types'

export type { Provider, GenerateOptions } from './types'

const ADAPTERS: Record<string, Provider> = {
  groq: openaiCompat({
    id: 'groq',
    label: 'Groq',
    // Groq's /models has no capability flag, so pick likely vision models by name.
    include: /vision|llama-4|scout|maverick|pixtral|-vl/i,
    preferred: ['meta-llama/llama-4-scout-17b-16e-instruct'],
    tokensParam: 'max_tokens',
    temperature: 0.2,
  }),
  openai: openaiCompat({
    id: 'openai',
    label: 'OpenAI',
    include: /^gpt-(4o|4\.1|5)/,
    exclude: /audio|realtime|transcribe|tts|image|search|instruct|codex|embedding/,
    preferred: ['gpt-4o', 'gpt-4.1'],
    tokensParam: 'max_completion_tokens',
  }),
  anthropic,
  google,
}

export interface ProviderInfo {
  id: string
  label: string
}

/** Providers that have API keys configured on the server. */
export async function listProviders(signal?: AbortSignal): Promise<ProviderInfo[]> {
  const res = await fetch('/ai/providers', { signal })
  if (!res.ok) throw new Error(`Could not load providers (${res.status}). Is the dev server running?`)
  const all = (await res.json()) as ProviderInfo[]
  return all.filter((p) => p.id in ADAPTERS)
}

export function getProvider(id: string): Provider {
  const p = ADAPTERS[id]
  if (!p) throw new Error(`Unknown provider: ${id}`)
  return p
}
