import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2022',
    // Niente manualChunks: forzare three in un chunk nominato lo faceva finire
    // fra i modulepreload dell'entry, annullando il lazy import di StoreCanvas.
    // Lasciando decidere al grafo, three segue il suo import dinamico.
    chunkSizeWarningLimit: 1000,
  },
})
