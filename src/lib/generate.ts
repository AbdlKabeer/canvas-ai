import { Editor, TLShapeId, createShapeId } from 'tldraw'
import { extractHtml } from './prompt'
import { getProvider } from './providers'

const MAX_EDGE = 1024

/** Exports the selection as a base64 PNG (no data: prefix), downscaled for speed. */
async function exportSelection(editor: Editor, ids: TLShapeId[]) {
  const scale = await pickScale(editor, ids)
  const { blob, width, height } = await editor.toImage(ids, {
    format: 'png',
    background: true,
    padding: 16,
    scale,
  })
  const buf = new Uint8Array(await blob.arrayBuffer())
  let bin = ''
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000))
  return { base64: btoa(bin), width, height }
}

async function pickScale(editor: Editor, ids: TLShapeId[]) {
  const bounds = editor.getSelectionPageBounds() ?? editor.getShapesPageBounds(ids)
  if (!bounds) return 1
  return Math.min(1, MAX_EDGE / Math.max(bounds.w, bounds.h))
}

export async function generateComponent(editor: Editor, providerId: string, model: string, signal: AbortSignal) {
  const ids = editor.getSelectedShapeIds()
  if (ids.length === 0) throw new Error('Select a sketch first.')
  const bounds = editor.getSelectionPageBounds()!

  const { base64 } = await exportSelection(editor, ids)

  // Placeholder appears right away, to the right of the sketch, then fills in as tokens stream.
  const id = createShapeId()
  editor.createShape({
    id,
    type: 'html-component',
    x: bounds.maxX + 40,
    y: bounds.y,
    props: { w: Math.max(320, bounds.w), h: Math.max(240, bounds.h), status: 'generating' },
  })

  let lastFlush = 0
  const push = (html: string) => editor.updateShape({ id, type: 'html-component', props: { html } })

  try {
    const full = await getProvider(providerId).generate({
      imageBase64: base64,
      model,
      signal,
      onToken: (text) => {
        const now = Date.now()
        if (now - lastFlush > 300) {
          lastFlush = now
          push(extractHtml(text))
        }
      },
    })
    editor.updateShape({
      id,
      type: 'html-component',
      props: { html: extractHtml(full), status: 'done' },
    })
  } catch (e) {
    const aborted = (e as Error).name === 'AbortError'
    editor.updateShape({
      id,
      type: 'html-component',
      props: { status: 'error', error: aborted ? 'Cancelled' : (e as Error).message },
    })
    if (!aborted) throw e
  }
}
