# Architecture

## Components

```
┌──────────────────────────── Browser (Vite SPA) ────────────────────────────┐
│                                                                            │
│  App.tsx ── Toolbar (model picker, Generate / Cancel)                      │
│     │                                                                      │
│     ▼                                                                      │
│  <Tldraw shapeUtils=[HtmlShapeUtil]>        src/lib/generate.ts            │
│     canvas, tools, selection  ─────────▶    export selection → PNG         │
│                                             create placeholder shape       │
│  HtmlShapeUtil (src/shapes)  ◀──────────    stream HTML into shape props   │
│     sandboxed iframe + Tailwind             │                              │
│                                             ▼                              │
│                                    src/lib/groq.ts (provider client)     │
└─────────────────────────────────────────────┬──────────────────────────────┘
                                              │  fetch('/groq/...')  (same origin)
                                              ▼
                              Vite middleware (server/groqProxy.ts)
                              injects API key, rotates on 429
                                              │
                                              ▼
                              Groq  api.groq.com/openai/v1
```

## Data flow
1. **Draw** with standard tldraw tools.
2. **Select & capture** – `editor.toImage(ids, { format: 'png', background: true, scale })`. The scale is chosen so the longest edge is ≤ 1024px (faster inference, smaller payload). The PNG is base64-encoded.
3. **Placeholder** – an `html-component` shape (`status: 'generating'`) is created immediately to the right of the selection, so the user sees feedback at once (glowing border).
4. **Inference** – the image plus a strict system prompt (UI engineer, Tailwind only, one `html` code block, no scripts/external resources) is sent through the proxy as an OpenAI-style chat completion; the SSE response is streamed.
5. **Parse & render** – tokens accumulate; `extractHtml` strips the markdown fence (tolerating an unclosed one while streaming). Shape props are updated at most every 300 ms so the iframe re-renders smoothly. On completion `status` becomes `done`; on failure `error`.

## Key modules

| File | Responsibility |
|---|---|
| `src/App.tsx` | Mounts tldraw, toolbar, abort control |
| `src/lib/generate.ts` | Capture → placeholder → stream → update shape |
| `src/lib/groq.ts` | Provider client: list models, streaming generate, `extractHtml`, system prompt |
| `src/shapes/HtmlShape.tsx` | Custom shape: props schema, sandboxed iframe, status UI |
| `server/groqProxy.ts` | Vite plugin: forwards `/groq/*` to Groq, adds the key, retries on 429 with the next key |
| `vite.config.ts` | Loads `GROQ_API_KEYS` (server-side only) and registers the proxy plugin |

## Custom shape: `html-component`
Props: `w`, `h`, `html`, `status` (`idle | generating | done | error`), `error`. Extending `BaseBoxShapeUtil` gives drag, resize and selection for free.

## Security model
- Model output is untrusted. It renders in `<iframe sandbox="allow-scripts">` **without** `allow-same-origin`, so it gets an opaque origin and cannot read the app's DOM, storage or cookies.
- Tailwind's browser build (`@tailwindcss/browser`) is inlined into the iframe `srcdoc`, so runtime-generated classes compile and nothing is fetched from a CDN.
- The prompt forbids `<script>`, but the sandbox is the real defence, not the prompt.
- The iframe has `pointer-events: none` unless the shape is being edited (double-click), otherwise it would swallow drags.
- **API keys never ship to the browser.** `GROQ_API_KEYS` (no `VITE_` prefix, which would inline it into the client bundle) is read by the Vite server and added by the proxy. A public deployment would need a real backend to do the same.

## Provider
Groq: `POST /openai/v1/chat/completions` with the PNG as a `data:image/png;base64,…` `image_url` part, SSE stream. Models come from `GET /openai/v1/models`, filtered by name to likely vision models (Groq exposes no capability flag). The client lives behind two functions (`listModels`, `generateFromImage`), so another provider (e.g. local Ollama) can be added later without touching the canvas code.

## Known limitations
- tldraw loads fonts/icons from its CDN by default.
- The multi-key rotation only helps before a stream starts; a rate limit mid-stream surfaces as an error. Check Groq's terms before rotating keys from separate accounts.
- No tests yet; the parsing/stream code is the highest-risk area.
- Each streamed update may become its own undo step.
