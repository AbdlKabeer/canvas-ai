import { BaseBoxShapeUtil, HTMLContainer, T, TLShape } from 'tldraw'
import tailwindBrowser from '@tailwindcss/browser?raw'

const HTML_SHAPE_TYPE = 'html-component'

declare module 'tldraw' {
  export interface TLGlobalShapePropsMap {
    [HTML_SHAPE_TYPE]: {
      w: number
      h: number
      html: string
      status: 'idle' | 'generating' | 'done' | 'error'
      error: string
    }
  }
}

export type HtmlShape = TLShape<typeof HTML_SHAPE_TYPE>

/**
 * Generated markup runs in a sandboxed iframe (no allow-same-origin), so it
 * can't touch the app. Tailwind's browser build is inlined so it works offline
 * and compiles whatever classes the model invented.
 */
function buildSrcDoc(html: string) {
  return `<!doctype html><html><head><meta charset="utf-8">
<script>${tailwindBrowser.replace(/<\/script/gi, '<\\/script')}</script>
<style>body{margin:0;padding:12px;font-family:ui-sans-serif,system-ui,sans-serif}</style>
</head><body>${html}</body></html>`
}

export class HtmlShapeUtil extends BaseBoxShapeUtil<HtmlShape> {
  static override type = HTML_SHAPE_TYPE
  static override props = {
    w: T.number,
    h: T.number,
    html: T.string,
    status: T.literalEnum('idle', 'generating', 'done', 'error'),
    error: T.string,
  }

  override canEdit() {
    return true
  }

  getDefaultProps(): HtmlShape['props'] {
    return { w: 400, h: 300, html: '', status: 'idle', error: '' }
  }

  component(shape: HtmlShape) {
    const { w, h, html, status, error } = shape.props
    // Iframes swallow pointer events; only let them through while editing
    // (double-click) so dragging/selecting the shape keeps working.
    const interactive = this.editor.getEditingShapeId() === shape.id

    return (
      <HTMLContainer
        className={`relative overflow-hidden rounded-lg bg-white ${status === 'generating' ? 'magic-glow' : 'shadow-md'}`}
        style={{ width: w, height: h, pointerEvents: 'all' }}
      >
        {html ? (
          <iframe
            title="Generated component"
            sandbox="allow-scripts"
            srcDoc={buildSrcDoc(html)}
            style={{
              width: '100%',
              height: '100%',
              border: 0,
              pointerEvents: interactive ? 'auto' : 'none',
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-center text-sm text-gray-500">
            {status === 'error' ? error : 'Thinking…'}
          </div>
        )}
        {status === 'error' && html && (
          <div className="absolute inset-x-0 bottom-0 bg-red-600 px-2 py-1 text-xs text-white">{error}</div>
        )}
      </HTMLContainer>
    )
  }

  getIndicatorPath(shape: HtmlShape) {
    const path = new Path2D()
    path.rect(0, 0, shape.props.w, shape.props.h)
    return path
  }
}
