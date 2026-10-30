/**
 * Esegue le suite e2e dall'inizio alla fine: build col contenuto giusto, server,
 * suite, spegnimento. Un comando solo, uguale in locale e in CI.
 *
 *   npm run e2e                      # tutte, tutti e due i contenuti
 *   npm run e2e -- --content into    # solo quelle del contenuto `into`
 *   npm run e2e -- --only cantiere   # una sola suite (sceglie lei il contenuto)
 *   npm run e2e -- --no-build        # riusa dist/, se l'hai appena costruita
 *   npm run e2e -- --out e2e-out     # screenshot qui invece che nel temporaneo
 *                                    # (in CI servono a capire un rosso)
 *
 * Perché esiste: a mano erano cinque passaggi (build col VITE_CONTENT giusto,
 * avvio della preview, scoprire che porta ha preso davvero, lanciare N suite con
 * CHROMIUM_PATH, spegnere il server), e due di questi sono trappole note — la
 * porta che cambia quando la 4173 è occupata, e una suite eseguita contro una
 * build di un altro contenuto, che fallisce su valori dell'altro catalogo.
 *
 * Il browser: CHROMIUM_PATH se c'è, altrimenti si cerca Chrome dove sta di
 * solito (Windows, macOS, e le immagini dei runner di GitHub).
 */
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Quale suite vuole quale contenuto. Chi non è elencato non dipende dal
// contenuto, e gira con quello di `into` (il contenuto della produzione).
const SUITES = {
  into: ['e2e-phase1b', 'e2e-phase2', 'e2e-phase3', 'e2e-phase4', 'e2e-phase5',
         'e2e-phase8a', 'e2e-navfix', 'e2e-landscape', 'e2e-cantiere'],
  demo: ['e2e-demo'],
}
// Misura prestazioni: su una macchina condivisa il p50 oscilla e il risultato
// dice più della macchina che del codice. Si esegue a mano, non qui.
const FUORI_DA_CI = new Set(['e2e-phase6'])

// I codici colore di vite, costruiti senza scrivere il carattere ESC dentro una
// regex: una regex con un carattere di controllo dentro è quasi sempre un errore,
// e il linter la segnala giustamente. Qui serve davvero, e si vede che serve.
const ANSI = new RegExp(String.fromCharCode(27) + '\\[[0-9;]*m', 'g')

const args = process.argv.slice(2)
const arg = (nome) => { const i = args.indexOf(`--${nome}`); return i >= 0 ? args[i + 1] : undefined }
const flag = (nome) => args.includes(`--${nome}`)

const soloSuite = arg('only')
const soloContenuto = arg('content')
const win = process.platform === 'win32'
const npm = win ? 'npm.cmd' : 'npm'
// Da Node 20 uno script .cmd non si avvia senza shell (EINVAL): su Windows
// serve `shell: true`, altrove no, e con la shell gli argomenti vanno quotati.
const viaShell = win

function chrome() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH
  const candidati = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser', '/usr/bin/chromium',
  ]
  const trovato = candidati.find((p) => existsSync(p))
  if (!trovato) {
    console.error('Nessun browser trovato. Indica l\'eseguibile con CHROMIUM_PATH.')
    process.exit(1)
  }
  return trovato
}

function build(contenuto) {
  console.log(`\n=== build (contenuto ${contenuto}) ===`)
  const r = spawnSync(npm, ['run', 'build'], {
    stdio: 'inherit', shell: viaShell, env: { ...process.env, VITE_CONTENT: contenuto },
  })
  if (r.status !== 0) {
    console.error(`build fallita${r.error ? `: ${r.error.message}` : ''}`)
    process.exit(1)
  }
}

/** Avvia `vite preview` e restituisce l'indirizzo che ha scelto DAVVERO. */
function avviaServer() {
  return new Promise((resolve, reject) => {
    const server = spawn(npm, ['run', 'preview'], { shell: viaShell, env: process.env })
    let uscita = ''
    const scaduto = setTimeout(() => {
      server.kill()
      reject(new Error(`il server non ha detto il suo indirizzo in 60 s:\n${uscita}`))
    }, 60000)
    const guarda = (b) => {
      uscita += b.toString()
      // La porta non è detta: se la 4173 è occupata vite ne prende un'altra e
      // lo scrive. Si legge da lì invece di darla per scontata. I codici colore
      // vanno tolti prima: vite ne infila uno fra "localhost:" e le cifre, e
      // dentro c'è un numero (`ESC[1m`) che verrebbe scambiato per la porta.
      const m = uscita.replace(ANSI, '').match(/localhost:([0-9]+)/)
      if (m) { clearTimeout(scaduto); resolve({ server, base: `http://localhost:${m[1]}` }) }
    }
    server.stdout.on('data', guarda)
    server.stderr.on('data', guarda)
    server.on('error', (e) => { clearTimeout(scaduto); reject(e) })
  })
}

const esiti = []

async function giro(contenuto, suites) {
  if (!suites.length) return
  if (!flag('no-build')) build(contenuto)
  const { server, base } = await avviaServer()
  console.log(`server su ${base}`)
  try {
    for (const suite of suites) {
      const out = join(arg('out') ?? join(tmpdir(), 'e2e-out'), suite)
      mkdirSync(out, { recursive: true })
      console.log(`\n--- ${suite} (${contenuto}) ---`)
      const r = spawnSync(process.execPath, [`scripts/e2e/${suite}.mjs`, base, out], {
        stdio: 'inherit',
        env: { ...process.env, CHROMIUM_PATH: chrome(), VITE_CONTENT: contenuto },
      })
      esiti.push([suite, contenuto, r.status === 0])
    }
  } finally {
    server.kill()
  }
}

const contenuti = soloContenuto ? [soloContenuto] : ['into', 'demo']
for (const contenuto of contenuti) {
  let suites = (SUITES[contenuto] ?? []).filter((s) => !FUORI_DA_CI.has(s))
  if (soloSuite) suites = suites.filter((s) => s.includes(soloSuite))
  await giro(contenuto, suites)
}

console.log('\n================ esito ================')
for (const [suite, contenuto, ok] of esiti) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${suite.padEnd(16)} (${contenuto})`)
}
const falliti = esiti.filter(([, , ok]) => !ok)
console.log(`\n${esiti.length - falliti.length}/${esiti.length} suite superate`)
if (!esiti.length) { console.error('nessuna suite eseguita: controlla --only / --content'); process.exit(1) }
process.exit(falliti.length ? 1 : 0)
