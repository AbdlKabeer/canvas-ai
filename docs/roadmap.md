# Roadmap

## Done
- [x] Vite + React + TS + Tailwind scaffold
- [x] tldraw canvas with Generate toolbar and model picker
- [x] Selection → downscaled PNG export
- [x] Ollama streaming client + dev proxy
- [x] `html-component` shape (sandboxed iframe, glow while generating, error state)
- [x] Cancel via `AbortController`

## Next
1. [ ] Provider interface + Groq adapter, `.env` key injected by the proxy, cloud-privacy notice in the UI
2. [ ] Test with real sketches; pick default model; tune prompt and `extractHtml`
3. [ ] Regenerate with feedback ("make it dark mode"); keep source sketch in shape `meta`
4. [ ] Code view toggle + copy / export HTML
5. [ ] Friendly errors: missing key, rate limit, model unavailable, empty output

## Later
- [ ] Multiple variants per sketch
- [ ] Group streamed updates into a single undo step
- [ ] Unit tests for `extractHtml` and stream parsing
- [ ] Bundle tldraw assets locally (if offline use matters)
- [ ] README screenshots / demo GIF
