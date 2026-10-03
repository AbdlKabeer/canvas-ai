import { useEffect, useRef, useState } from 'react'
import { Editor, Tldraw, track } from 'tldraw'
import { HtmlShapeUtil } from './shapes/HtmlShape'
import { getProvider, listProviders, type ProviderInfo } from './lib/providers'
import { generateComponent } from './lib/generate'

const shapeUtils = [HtmlShapeUtil]

const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k) ?? ''
    } catch {
      return ''
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v)
    } catch {
      /* storage unavailable */
    }
  },
}

const Toolbar = track(function Toolbar({ editor }: { editor: Editor }) {
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [providerId, setProviderId] = useState('')
  const [models, setModels] = useState<string[]>([])
  const [model, setModel] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const abort = useRef<AbortController | null>(null)

  useEffect(() => {
    listProviders()
      .then((list) => {
        if (list.length === 0) {
          setError('No provider keys configured. Add GROQ_API_KEYS, OPENAI_API_KEYS, ANTHROPIC_API_KEYS or GOOGLE_API_KEYS to .env and restart.')
          return
        }
        setProviders(list)
        const saved = store.get('provider')
        setProviderId(list.some((p) => p.id === saved) ? saved : list[0].id)
      })
      .catch((e) => setError((e as Error).message))
  }, [])

  useEffect(() => {
    if (!providerId) return
    const ctl = new AbortController()
    setModels([])
    setModel('')
    getProvider(providerId)
      .listModels(ctl.signal)
      .then((m) => {
        setError('')
        if (m.length === 0) setError('This provider returned no models for your key.')
        setModels(m)
        const saved = store.get(`model:${providerId}`)
        setModel(m.includes(saved) ? saved : (m[0] ?? ''))
      })
      .catch((e) => {
        if ((e as Error).name !== 'AbortError') setError((e as Error).message)
      })
    return () => ctl.abort()
  }, [providerId])

  const hasSelection = editor.getSelectedShapeIds().length > 0

  const run = async () => {
    setError('')
    setBusy(true)
    abort.current = new AbortController()
    try {
      await generateComponent(editor, providerId, model, abort.current.signal)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const selectCls = 'rounded-md border border-gray-300 px-2 py-1 text-sm'

  return (
    <div className="pointer-events-auto absolute left-1/2 top-3 z-[400] flex -translate-x-1/2 flex-wrap items-center gap-2 rounded-xl bg-white/95 p-2 shadow-lg ring-1 ring-black/10">
      <select
        aria-label="Provider"
        className={selectCls}
        value={providerId}
        disabled={busy || providers.length === 0}
        onChange={(e) => {
          setProviderId(e.target.value)
          store.set('provider', e.target.value)
        }}
      >
        {providers.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      <select
        aria-label="Model"
        className={selectCls}
        value={model}
        disabled={busy || models.length === 0}
        onChange={(e) => {
          setModel(e.target.value)
          store.set(`model:${providerId}`, e.target.value)
        }}
      >
        {models.map((m) => (
          <option key={m}>{m}</option>
        ))}
      </select>
      {busy ? (
        <button className="rounded-md bg-red-600 px-3 py-1 text-sm font-medium text-white" onClick={() => abort.current?.abort()}>
          Cancel
        </button>
      ) : (
        <button
          className="rounded-md bg-violet-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-40"
          disabled={!hasSelection || !model}
          onClick={run}
        >
          ✨ Generate
        </button>
      )}
      {providerId && <span className="text-xs text-gray-500">Sketch is sent to {providers.find((p) => p.id === providerId)?.label}</span>}
      {error && <span className="max-w-md text-xs text-red-600">{error}</span>}
    </div>
  )
})

export default function App() {
  const [editor, setEditor] = useState<Editor | null>(null)
  return (
    <div className="fixed inset-0">
      <Tldraw shapeUtils={shapeUtils} onMount={setEditor} persistenceKey="canvas-ai" />
      {editor && <Toolbar editor={editor} />}
    </div>
  )
}
