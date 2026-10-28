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

const errors = validateStoreConfig(storeConfig)
if (errors.length) {
  console.error(`storeConfig: ${errors.length} invarianti violate`)
  for (const e of errors) console.error(`  ${e}`)
  process.exit(1)
}
console.log('storeConfig: nessuna invariante violata')
