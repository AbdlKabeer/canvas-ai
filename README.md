# CanvasAI

Sketch a wireframe on an infinite [tldraw](https://tldraw.dev) canvas, select it, click **✨ Generate**, and a vision
model on [Groq](https://groq.com) turns it into HTML/Tailwind that appears next to the sketch as a draggable,
resizable shape. The canvas is local; **the exported sketch image is sent to Groq** for inference.

## Run

```bash
npm install
echo 'GROQ_API_KEYS=gsk_key1,gsk_key2' > .env   # comma-separated; git-ignored
npm run dev
```

Keys are read by the Vite dev server (`server/groqProxy.ts`) and added server-side; they never reach the browser.
Do not use a `VITE_` prefix: those variables are bundled into client code.

## How it works

- `server/groqProxy.ts` – `/groq/*` → Groq, injects an API key, tries the next key on HTTP 429.
- `src/lib/groq.ts` – model listing, streaming (SSE) client, code-fence extraction.
- `src/lib/generate.ts` – exports the selection as a downscaled PNG, creates a placeholder shape, streams HTML into it.
- `src/shapes/HtmlShape.tsx` – custom tldraw shape; sandboxed iframe with Tailwind's browser build inlined.
  Double-click the shape to interact with it.

## Docs
See [`docs/`](docs/README.md) for the overview, architecture, decisions, roadmap and development guide.
