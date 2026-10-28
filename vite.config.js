import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

// Commit della build, riportato dal benchmark nel registro di docs/PERF.md.
// Su Vercel arriva dall'ambiente; in locale da git.
function buildCommit() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7)
  // execFileSync, non execSync: nessuna shell di mezzo, quindi niente stringa
  // interpretata da cmd.exe, che su Windows cercherebbe un git.bat nella
  // cartella corrente prima di quello nel PATH.
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim()
  } catch { return 'locale' }
}

// Gli header di sicurezza hanno una sola fonte: vercel.json. `npm run preview`
// li rilegge da lì, così la CSP si verifica in locale sugli stessi valori che
// vanno in produzione, e le due copie non possono divergere.
function productionHeaders() {
  try {
    const { headers } = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8'))
    const global = headers.filter((b) => b.source === '/(.*)').flatMap((b) => b.headers)
    return Object.fromEntries(global.map(({ key, value }) => [key, value]))
  } catch {
    // Senza vercel.json la preview resta utilizzabile: si perde solo la verifica.
    return {}
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { __BUILD_COMMIT__: JSON.stringify(buildCommit()) },
  preview: { headers: productionHeaders() },
  build: {
    target: 'es2022',
    // Niente manualChunks: forzare three in un chunk nominato lo faceva finire
    // fra i modulepreload dell'entry, annullando il lazy import di StoreCanvas.
    // Lasciando decidere al grafo, three segue il suo import dinamico.
    chunkSizeWarningLimit: 1000,
  },
})
