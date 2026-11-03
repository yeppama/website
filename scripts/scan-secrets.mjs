/**
 * Cerca credenziali nei file tracciati da git.
 *
 * Perché esiste: dal 2026-10-17 al 2026-10-28 un `.env` è rimasto tracciato in un
 * repository pubblico. Conteneva solo `VITE_CONTENT=demo` — nessun segreto, ed è
 * stato riletto dalla storia per esserne certi — ma nessuno se n'era accorto, e
 * nessun controllo l'avrebbe detto. Questo lo dice, prima del commit o in CI.
 *
 *   npm run scan:secrets            # tutti i file tracciati
 *   node scripts/scan-secrets.mjs <file…>   # solo questi (serve alle prove)
 *   npm run scan:secrets -- --history       # anche ogni riga aggiunta nella storia git
 *
 * Cosa NON cerca, di proposito: stringhe a caso ad alta entropia. Il token della
 * Storefront API di Shopify è 32 caratteri esadecimali e sta nel codice **per
 * costruzione** (è pubblico, lo legge il browser di chiunque: docs/PLAN-8.md).
 * Una regola generica su "32 esadecimali" lo segnalerebbe a ogni giro, e un
 * controllo che grida sempre viene spento. Qui ci sono solo prefissi che
 * appartengono a credenziali vere, quelle che non devono stare in un repository.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'

const SOSPETTI = [
  [/shp(at|ss|ca|pa)_[a-fA-F0-9]{32}/, 'token privato di Shopify (admin / custom app)'],
  [/AKIA[0-9A-Z]{16}/, 'chiave di accesso AWS'],
  [/\b(sk|rk)_live_[A-Za-z0-9]{10,}/, 'chiave segreta Stripe di produzione'],
  [/\bgh[pousr]_[A-Za-z0-9]{36}/, 'token GitHub'],
  [/\bgithub_pat_[A-Za-z0-9_]{20,}/, 'token GitHub (fine-grained)'],
  [/-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/, 'chiave privata'],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}/, 'token Slack'],
  [/\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/, 'chiave SendGrid'],
  // Aggiunti col l'audit del 2026-11-02 (§4-bis punto 7): i servizi che questo
  // progetto usa davvero (npm, Vercel) e le chiavi Google.
  [/\bnpm_[A-Za-z0-9]{36}\b/, 'token npm'],
  [/\bvercel_[A-Za-z0-9_-]{20,}/, 'token Vercel'],
  [/\bAIza[0-9A-Za-z_-]{35}\b/, 'chiave API Google'],
]

// Un file di ambiente tracciato è un problema a prescindere da cosa contiene:
// oggi è una variabile innocua, domani è una password aggiunta senza pensarci.
const VIETATI = [/(^|\/)\.env(\.|$)/, /(^|\/)\.envrc$/, /(^|\/)\.npmrc$/, /\.pem$/, /\.p12$/, /\.pfx$/, /(^|\/)id_(rsa|dsa|ecdsa|ed25519)$/]
const AMMESSI = [/(^|\/)\.env\.example$/]

const BINARI = /\.(png|jpe?g|webp|gif|glb|gltf|woff2?|ttf|otf|mp4|webm|ico|pdf|xlsx|zip)$/i
const MAX_BYTE = 2 * 1024 * 1024

const args = process.argv.slice(2)
const history = args.includes('--history')
const files = args.filter((a) => a !== '--history')
if (!files.length) files.push(...execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean))

const problemi = []
// Il file che stai leggendo contiene i pattern: cercherebbe se stesso. Percorso
// esatto, non un suffisso: `altro/scripts/scan-secrets.mjs` va controllato.
const SE_STESSO = 'scripts/scan-secrets.mjs'

for (const file of files) {
  const normalizzato = file.replace(/\\/g, '/')
  if (AMMESSI.some((r) => r.test(normalizzato))) continue
  if (VIETATI.some((r) => r.test(normalizzato))) {
    problemi.push(`${file}: file di credenziali tracciato da git`)
    continue
  }
  if (BINARI.test(normalizzato)) continue
  let testo
  try {
    if (statSync(file).size > MAX_BYTE) continue
    testo = readFileSync(file, 'utf8')
  } catch { continue }
  if (normalizzato === SE_STESSO) continue
  testo.split('\n').forEach((riga, i) => {
    for (const [pattern, cosa] of SOSPETTI) {
      if (pattern.test(riga)) problemi.push(`${file}:${i + 1}: ${cosa}`)
    }
  })
}

// File vietati già noti nella storia, verificati e documentati: il `.env` del
// 2026-10-17 conteneva solo VITE_CONTENT=demo (docs/SICUREZZA.md, audit
// 2026-11-02 §4-bis). Si riconosce dal blob (il contenuto esatto), non dal
// commit: in CI lo stesso file compariva sotto un commit che in locale non
// c'era, e il controllo falliva su un file già verificato. Un .env con un
// contenuto diverso ha un altro blob e fa fallire il controllo.
const NOTI_NELLA_STORIA = new Set(['.env 76ca7f0da59bcfdf0177fd7609dfaefe72cb619b'])

// Storia: un segreto tolto da un file resta nei commit di prima. Si leggono le
// righe aggiunte da ogni commit di ogni branch, file vietati compresi.
if (history) {
  const log = execFileSync('git', ['log', '--all', '-p', '--full-index', '--no-color', '--no-ext-diff', '--format=commit %H'], { encoding: 'utf8', maxBuffer: 1 << 30 })
  let commit = '', file = '', blob = ''
  for (const riga of log.split('\n')) {
    if (riga.startsWith('commit ')) { commit = riga.slice(7, 14); continue }
    const idx = riga.match(/^index [0-9a-f]+\.\.([0-9a-f]+)/)
    if (idx) { blob = idx[1]; continue }
    if (riga.startsWith('+++ b/')) {
      file = riga.slice(6)
      if (VIETATI.some((r) => r.test(file)) && !AMMESSI.some((r) => r.test(file)) && !NOTI_NELLA_STORIA.has(`${file} ${blob}`)) problemi.push(`${commit} ${file}: file di credenziali nella storia`)
      continue
    }
    if (!riga.startsWith('+') || riga.startsWith('+++') || file === SE_STESSO) continue
    for (const [pattern, cosa] of SOSPETTI) {
      if (pattern.test(riga)) problemi.push(`${commit} ${file}: ${cosa}`)
    }
  }
}

if (problemi.length) {
  console.error(`segreti: ${problemi.length} problemi`)
  for (const p of problemi) console.error(`  ${p}`)
  console.error('\nUn segreto gia\' committato resta nella storia: toglierlo dal file non basta, va ruotato.')
  process.exit(1)
}
console.log(`segreti: nessuno nei ${files.length} file tracciati${history ? ' né nella storia git' : ''}`)
