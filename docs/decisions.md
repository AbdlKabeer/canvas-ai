# Decisions

Short records of choices and why. Newest last.

## 1. Vite over Next.js
**Decision:** Vite SPA. **Why:** the app is client-only; a dev-server proxy removes CORS issues in ~5 lines and streaming works unchanged. Next would add a server layer we don't need. **Revisit if:** we want saved boards, auth, or a hosted deployment.

## 2. tldraw for the canvas
**Decision:** use tldraw with a custom shape. **Why:** world-class whiteboard out of the box; custom shapes give drag/resize/selection for free.

## 3. Sandboxed iframe, not `dangerouslySetInnerHTML`
**Decision:** render output in `<iframe sandbox="allow-scripts" srcdoc>` with Tailwind's browser build inlined. **Why:** (a) the app's compiled Tailwind only contains classes found at build time, so model-invented classes would be unstyled; (b) untrusted HTML must be isolated from the app.

## 4. Stream into a placeholder shape
**Decision:** create the shape immediately and update it as tokens arrive (throttled to 300 ms). **Why:** vision models are slow; progressive rendering is better feedback than a spinner at the same cost.

## 5. Groq instead of local Ollama
**Decision:** use Groq for inference. **Why:** running a vision model locally loads the user's machine; Groq is much faster and uses larger models. **Cost:** sketches are sent to a third party, so "100% local" no longer holds and the UI should disclose it. **Status:** implemented; Ollama was removed (see git history) and can return behind the same two-function client.

## 6. API keys stay server-side
**Decision:** keys live in `GROQ_API_KEYS` and are added by a Vite middleware (`server/groqProxy.ts`), not read in the browser. **Why:** `VITE_*` variables are inlined into the client bundle, exposing keys to anyone who opens DevTools. **Revisit if:** deploying publicly, which needs a real backend.
