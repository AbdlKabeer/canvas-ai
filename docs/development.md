# Development

## Run
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
```

## AI provider setup
**Ollama (implemented):**
```bash
ollama pull qwen2.5vl:7b
```
The dev server proxies `/ollama` → `http://localhost:11434` (override with `OLLAMA_URL`).

**Groq (planned):** put `GROQ_API_KEY=...` in a local `.env` (git-ignored). Never commit it or paste it into chats or issues.

## Using the app
1. Draw a wireframe, select it.
2. Pick a model and click **✨ Generate**.
3. The result appears to the right of the sketch. Double-click it to interact; click Cancel to abort a running generation.

## Troubleshooting
- *"Cannot reach Ollama"* – start it (`ollama serve`) and check the proxy target.
- *Blank result* – the model may not have returned an `html` block; try another model.
