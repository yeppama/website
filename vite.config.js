import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'node:child_process'

// Commit della build, riportato dal benchmark nel registro di docs/PERF.md.
// Su Vercel arriva dall'ambiente; in locale da git.
function buildCommit() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7)
  try { return execSync('git rev-parse --short HEAD').toString().trim() } catch { return 'locale' }
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { __BUILD_COMMIT__: JSON.stringify(buildCommit()) },
  build: {
    target: 'es2022',
    // Niente manualChunks: forzare three in un chunk nominato lo faceva finire
    // fra i modulepreload dell'entry, annullando il lazy import di StoreCanvas.
    // Lasciando decidere al grafo, three segue il suo import dinamico.
    chunkSizeWarningLimit: 1000,
    // Seconda pagina: la prova dell'allestimento "cantiere" (docs/cantiere/PIANO.md), separata
    // dal sito; il suo codice non entra nel bundle della pagina principale.
    rollupOptions: { input: { main: 'index.html', cantiere: 'prova-cantiere.html' } },
  },
})
