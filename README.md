# CanvasAI (Local Vision)

Sketch a wireframe on an infinite [tldraw](https://tldraw.dev) canvas, select it, click **✨ Generate**, and a local
vision model (via [Ollama](https://ollama.ai)) turns it into HTML/Tailwind that appears next to the sketch as a
draggable, resizable shape. Everything runs on your machine.

## Run

```bash
ollama pull qwen2.5vl:7b      # or llama3.2-vision / llava
npm install
npm run dev
```

The Vite dev server proxies `/ollama` → `http://localhost:11434` (override with `OLLAMA_URL`), so no CORS setup is needed.

## How it works

- `src/lib/ollama.ts` – streaming client for `/api/generate`, model listing, code-fence extraction.
- `src/lib/generate.ts` – exports the selection as a downscaled PNG, creates a placeholder shape, streams HTML into it.
- `src/shapes/HtmlShape.tsx` – custom tldraw shape; renders output in a sandboxed iframe with Tailwind's browser build
  inlined. Double-click the shape to interact with it.
