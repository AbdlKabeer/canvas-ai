# Roadmap

## Done
- [x] Vite + React + TS + Tailwind scaffold
- [x] tldraw canvas with Generate toolbar and model picker
- [x] Selection → downscaled PNG export
- [x] Groq streaming client (SSE) + server-side key proxy with 429 rotation
- [x] Model list fetched from Groq `/models`
- [x] `html-component` shape (sandboxed iframe, glow while generating, error state)
- [x] Cancel via `AbortController`

## Next
1. [ ] Run against the real Groq API; confirm the default vision model; tune prompt and `extractHtml`
2. [ ] Cloud-privacy notice in the UI
3. [ ] Regenerate with feedback ("make it dark mode"); keep source sketch in shape `meta`
4. [ ] Code view toggle + copy / export HTML
5. [ ] Friendly errors: missing key, rate limit, model unavailable, empty output

## Later
- [ ] Multiple variants per sketch
- [ ] Group streamed updates into a single undo step
- [ ] Unit tests for `extractHtml` and stream parsing
- [ ] Bundle tldraw assets locally (if offline use matters)
- [ ] README screenshots / demo GIF
