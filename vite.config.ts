import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The browser talks to /ollama on its own origin; Vite forwards to the local
// Ollama server, which sidesteps CORS (no OLLAMA_ORIGINS setup needed).
const ollama = {
  '/ollama': {
    target: process.env.OLLAMA_URL ?? 'http://localhost:11434',
    changeOrigin: true,
    rewrite: (p: string) => p.replace(/^\/ollama/, ''),
  },
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: ollama },
  preview: { proxy: ollama },
})
