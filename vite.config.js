import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'node:child_process'

// Commit della build, riportato dal benchmark nel registro di docs/PERF.md.
// Su Vercel arriva dall'ambiente; in locale da git.
function buildCommit() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7)
  try { return execSync('git rev-parse --short HEAD').toString().trim() } catch { return 'locale' }
}

// Il branch della demo ha `.env` con VITE_CONTENT=demo. Se quel file arrivasse su `main`, la
// produzione passerebbe ai contenuti dimostrativi senza che nessuno se ne accorga: in
// produzione Vercel (o da `main`) la build con il contenuto demo si ferma con un errore.
function guardProductionContent(mode) {
  const content = loadEnv(mode, process.cwd(), 'VITE_').VITE_CONTENT ?? process.env.VITE_CONTENT ?? 'into'
  const production = process.env.VERCEL_ENV === 'production' || process.env.VERCEL_GIT_COMMIT_REF === 'main'
  if (production && content === 'demo') {
    throw new Error(
      'VITE_CONTENT=demo in una build di produzione. Il contenuto demo vive solo sul branch della demo: ' +
      'togliere `.env` da main (o la variabile da Vercel) e ripubblicare.',
    )
  }
}

export default defineConfig(({ mode }) => (guardProductionContent(mode), {
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
}))
