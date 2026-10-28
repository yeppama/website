/**
 * Opzioni comuni per i lanci di Chromium delle suite e2e.
 *
 * Due cose che non vanno ripetute in sei file:
 *
 * 1. `--no-sandbox` serve nei container (e in CI), dove Chromium non riesce ad
 *    aprire la sandbox. In locale toglierla è una barriera in meno fra la pagina
 *    sotto test e la macchina, quindi si attiva solo su richiesta esplicita:
 *    CI=1 o CHROMIUM_NO_SANDBOX=1.
 * 2. Il bersaglio deve essere locale. Le suite ricevono l'URL da `process.argv`
 *    e lo aprono in un browser che può essere senza sandbox: un indirizzo
 *    remoto passato per sbaglio diventerebbe codice non fidato in un renderer
 *    senza protezioni.
 */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

export const chromiumArgs = () => [
  ...(process.env.CI || process.env.CHROMIUM_NO_SANDBOX ? ['--no-sandbox'] : []),
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--disable-dev-shm-usage',
]

/** Valida l'URL di base passato alla suite e lo restituisce senza slash finale. */
export function localBase(value) {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error(`URL di base non valido: ${value}\nAtteso per esempio http://localhost:4173`)
  }
  if (!LOCAL_HOSTS.has(url.hostname) || (url.protocol !== 'http:' && url.protocol !== 'https:')) {
    throw new Error(`Le suite e2e girano solo su un server locale, ricevuto: ${value}`)
  }
  return url.origin
}

/**
 * Eseguibile di Chromium. Il default è il percorso del container in cui sono
 * state scritte le suite; CHROMIUM_PATH permette di girarle altrove (Chrome o
 * Edge di sistema), per esempio su Windows.
 */
export const chromiumPath = () =>
  process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
