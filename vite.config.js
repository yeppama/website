import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execFileSync } from 'node:child_process'

// Commit della build, riportato dal benchmark nel registro di docs/PERF.md.
// Su Vercel arriva dall'ambiente; in locale da git.
function buildCommit() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7)
  // execFileSync e non execSync: nessuna shell di mezzo, quindi su Windows cmd.exe
  // non può raccogliere un git.bat dalla cartella corrente al posto di quello nel PATH.
  return git(['rev-parse', '--short', 'HEAD']) || 'locale'
}

function git(args) {
  try {
    return execFileSync('git', args, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch { return '' }
}

// Il branch su cui gira la build: su Vercel dall'ambiente, in locale da git.
const DEMO_BRANCH = 'sviluppo'
const branchName = () => process.env.VERCEL_GIT_COMMIT_REF || git(['rev-parse', '--abbrev-ref', 'HEAD'])

/**
 * Quale contenuto entra nella build.
 *
 * L'interruttore stava in un `.env` committato, tolto il 2026-10-28 perché un
 * .env non va in un repository pubblico. Senza quel file le anteprime di
 * `sviluppo` sarebbero tornate ai segnaposto senza che nessuno se ne accorgesse,
 * quindi il contenuto `demo` ora si accende da solo sul branch della demo.
 * Resta sovrascrivibile con VITE_CONTENT (lo fa `npm run test:content`), e la
 * guardia qui sotto protegge comunque la produzione.
 */
function contentMode(mode) {
  const declared = loadEnv(mode, process.cwd(), 'VITE_').VITE_CONTENT ?? process.env.VITE_CONTENT
  if (declared) return declared
  return branchName() === DEMO_BRANCH ? 'demo' : 'into'
}

// Il branch della demo ha `.env` con VITE_CONTENT=demo. Se quel file arrivasse su `main`, la
// produzione passerebbe ai contenuti dimostrativi senza che nessuno se ne accorga: in
// produzione Vercel (o da `main`) la build con il contenuto demo si ferma con un errore.
function guardProductionContent(content) {
  const production = process.env.VERCEL_ENV === 'production' || process.env.VERCEL_GIT_COMMIT_REF === 'main'
  if (production && content === 'demo') {
    throw new Error(
      'VITE_CONTENT=demo in una build di produzione. Il contenuto demo vive solo sul branch della demo: ' +
      'togliere la variabile VITE_CONTENT, da Vercel o dall ambiente, e ripubblicare.',
    )
  }
}

export default defineConfig(({ mode }) => {
  const content = contentMode(mode)
  guardProductionContent(content)
  return {
  plugins: [react(), tailwindcss()],
  // VITE_CONTENT è definito qui e non più da un file .env: src/content/index.js
  // legge import.meta.env.VITE_CONTENT e deve trovare il valore risolto sopra.
  define: {
    __BUILD_COMMIT__: JSON.stringify(buildCommit()),
    'import.meta.env.VITE_CONTENT': JSON.stringify(content),
  },
  build: {
    target: 'es2022',
    // Niente manualChunks: forzare three in un chunk nominato lo faceva finire
    // fra i modulepreload dell'entry, annullando il lazy import di StoreCanvas.
    // Lasciando decidere al grafo, three segue il suo import dinamico.
    chunkSizeWarningLimit: 1000,
  },
  }
})
