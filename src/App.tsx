import { useEffect, useRef, useState } from 'react'
import { Editor, Tldraw, track } from 'tldraw'
import { HtmlShapeUtil } from './shapes/HtmlShape'
import { DEFAULT_MODEL, listModels } from './lib/ollama'
import { generateComponent } from './lib/generate'

const shapeUtils = [HtmlShapeUtil]

const Toolbar = track(function Toolbar({ editor }: { editor: Editor }) {
  const [models, setModels] = useState<string[]>([])
  const [model, setModel] = useState(DEFAULT_MODEL)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const abort = useRef<AbortController | null>(null)

  useEffect(() => {
    listModels()
      .then((m) => {
        setModels(m)
        if (m.length && !m.includes(DEFAULT_MODEL)) setModel(m[0])
      })
      .catch(() => setError('Cannot reach Ollama at localhost:11434. Is it running?'))
  }, [])

  const hasSelection = editor.getSelectedShapeIds().length > 0

  const run = async () => {
    setError('')
    setBusy(true)
    abort.current = new AbortController()
    try {
      await generateComponent(editor, model, abort.current.signal)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pointer-events-auto absolute left-1/2 top-3 z-[400] flex -translate-x-1/2 items-center gap-2 rounded-xl bg-white/95 p-2 shadow-lg ring-1 ring-black/10">
      <select
        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
        value={model}
        onChange={(e) => setModel(e.target.value)}
        disabled={busy}
      >
        {[...new Set([model, ...models])].map((m) => (
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
          disabled={!hasSelection}
          onClick={run}
        >
          ✨ Generate
        </button>
      )}
      {error && <span className="max-w-xs text-xs text-red-600">{error}</span>}
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
