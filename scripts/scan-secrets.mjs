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
]

// Un file di ambiente tracciato è un problema a prescindere da cosa contiene:
// oggi è una variabile innocua, domani è una password aggiunta senza pensarci.
const VIETATI = [/(^|\/)\.env(\.|$)/, /\.pem$/, /\.p12$/, /\.pfx$/, /(^|\/)id_(rsa|dsa|ecdsa|ed25519)$/]
const AMMESSI = [/(^|\/)\.env\.example$/]

const BINARI = /\.(png|jpe?g|webp|gif|glb|gltf|woff2?|ttf|otf|mp4|webm|ico|pdf|xlsx|zip)$/i
const MAX_BYTE = 2 * 1024 * 1024

const files = process.argv.length > 2
  ? process.argv.slice(2)
  : execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean)

const problemi = []

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
  // Il file che stai leggendo contiene i pattern: cercherebbe se stesso.
  if (normalizzato.endsWith('scripts/scan-secrets.mjs')) continue
  testo.split('\n').forEach((riga, i) => {
    for (const [pattern, cosa] of SOSPETTI) {
      if (pattern.test(riga)) problemi.push(`${file}:${i + 1}: ${cosa}`)
    }
  })
}

if (problemi.length) {
  console.error(`segreti: ${problemi.length} problemi`)
  for (const p of problemi) console.error(`  ${p}`)
  console.error('\nUn segreto gia\' committato resta nella storia: toglierlo dal file non basta, va ruotato.')
  process.exit(1)
}
console.log(`segreti: nessuno nei ${files.length} file tracciati`)
