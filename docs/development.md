# Development

## Run
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
```

## AI provider setup
Create a git-ignored `.env`:
```
GROQ_API_KEYS=gsk_key1,gsk_key2
```
Comma-separated; on HTTP 429 the proxy tries the next key. Never use a `VITE_` prefix, never commit the file, and never paste keys into chats or issues. Restart `npm run dev` after changing it. Optional: `GROQ_BASE_URL` overrides the upstream (useful for mocks).

## Using the app
1. Draw a wireframe, select it.
2. Pick a model and click **✨ Generate**.
3. The result appears to the right of the sketch. Double-click it to interact; click Cancel to abort a running generation.

## Troubleshooting
- *"GROQ_API_KEYS is not set"* – add it to `.env` and restart the dev server.
- *Groq 4xx on every request* – the selected model may be retired or not a vision model; pick another from the dropdown.
- *Blank result* – the model may not have returned an `html` block; try another model.
