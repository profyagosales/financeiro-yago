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
    // Sourcemaps em prod: SEMPRE. Sem isso, stack traces vêm minificadas
    // (ex: "null is not an object (evaluating 'n.type')" em BfzoSeV0.js:45)
    // e debugar produção vira adivinhação. Custo: ~2MB extra no /assets/,
    // só carregado quando devtools abre. Vale a pena.
    sourcemap: true,
  },
})
