import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { aiProxy, providersFromEnv } from './server/aiProxy'

export default defineConfig(({ mode }) => {
  // '' prefix: read non-VITE_ vars so keys stay server-side and never enter the client bundle.
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  return { plugins: [react(), tailwindcss(), aiProxy(providersFromEnv(env))] }
})
