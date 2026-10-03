import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { groqProxy } from './server/groqProxy'

export default defineConfig(({ mode }) => {
  // '' prefix: read non-VITE_ vars so the keys stay server-side and never enter the client bundle.
  const env = loadEnv(mode, process.cwd(), '')
  const keys = (env.GROQ_API_KEYS ?? '').split(',').map((k) => k.trim()).filter(Boolean)
  return {
    plugins: [react(), tailwindcss(), groqProxy(keys, env.GROQ_BASE_URL)],
  }
})
