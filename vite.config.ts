import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': resolve(__dirname, './src') },
  },
  build: {
    // Sourcemaps OFF em prod:
    // 1. Vercel bloqueia .map por padrão (403) → polui console com 30+ erros
    // 2. Já debuguei root causes via grep no JS bruto + console logs
    // 3. Reduz tamanho do build (~2MB)
    // Pra debugar bugs futuros: temporariamente ligar via `sourcemap: 'hidden'`
    // (gera mas não anexa //# sourceMappingURL) OU usar `vercel.json` headers
    // pra liberar /assets/*.map.
    sourcemap: false,
  },
})
