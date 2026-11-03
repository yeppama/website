/**
 * Invarianti di storeConfig come passo di build.
 *
 * Perché esiste: `assertStoreConfig` gira solo in sviluppo (import.meta.env.DEV),
 * quindi un ID sbagliato o un campo mancante entrato col materiale reale non
 * fermava `npm run build`: usciva in produzione e si vedeva come una scena
 * incompleta o, peggio, un errore nel render. Qui fa fallire la build.
 *
 *   npm run validate:config
 */
import { storeConfig } from '../src/config/storeConfig.js'
import { validateStoreConfig } from '../src/config/validateStoreConfig.js'
import { readFileSync } from 'node:fs'

const errors = validateStoreConfig(storeConfig)

// CSP e negozio devono parlare dello stesso host: alla 8c cambiano insieme, e se
// cambia solo uno dei due il carrello smette di funzionare in silenzio (CONTEXT §6,
// audit 2026-11-02 §4-bis punto 5). Il dominio è quello che la build userà davvero:
// VITE_SHOPIFY_DOMAIN se c'è, altrimenti storeConfig (stessa precedenza del sito).
{
  const domain = process.env.VITE_SHOPIFY_DOMAIN || storeConfig.commerce.shopify?.domain
  const headers = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')).headers ?? []
  const csp = headers.flatMap((h) => h.headers ?? []).find((h) => h.key.toLowerCase() === 'content-security-policy')?.value ?? ''
  const connect = (csp.split(';').map((d) => d.trim()).find((d) => d.startsWith('connect-src')) ?? '').split(/\s+/).slice(1)
  if (domain && !connect.includes(`https://${domain}`)) {
    errors.push(`[CSP] connect-src di vercel.json non contiene https://${domain}: il carrello non potrebbe chiamare Shopify (${connect.join(' ') || 'connect-src assente'})`)
  }
  const extra = connect.filter((s) => s.endsWith('.myshopify.com') && s !== `https://${domain}`)
  if (extra.length) errors.push(`[CSP] connect-src apre anche ${extra.join(', ')}, che non è il negozio configurato (${domain})`)
}
if (errors.length) {
  console.error(`storeConfig: ${errors.length} invarianti violate`)
  for (const e of errors) console.error(`  ${e}`)
  process.exit(1)
}
console.log('storeConfig: nessuna invariante violata')
