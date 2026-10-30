/**
 * Scope della Storefront API: cosa puo' fare davvero il token pubblico.
 *
 * Perche' esiste: gli scope del canale Headless si impostano a mano
 * nell'amministrazione Shopify, e il token che li porta sta nel codice del sito,
 * quindi lo legge chiunque. Il 2026-10-30 il negozio di sviluppo ne aveva dieci
 * attivi su sedici, fra cui i due dei clienti, che il sito non usa: nessun
 * controllo se ne sarebbe accorto, perche' un permesso di troppo non rompe
 * niente — allarga solo la superficie. Questo script lo chiede al negozio.
 *
 * Alla 8c si rilancia contro il negozio del cliente, e deve dare lo stesso esito.
 *
 * Interroga il negozio dal vivo, quindi NON sta in CI: si lancia a mano.
 *
 *   npm run check:scopes
 *
 * Nessuna mutazione: in particolare `write_customers` non si sonda, perche'
 * ogni prova sarebbe una scrittura sui clienti (`customerRecover` manda email).
 * Lo si legge dall'amministrazione.
 */
import { storeConfig } from '../src/config/storeConfig.js'

const { domain, storefrontToken, apiVersion } = storeConfig.commerce.shopify
const endpoint = `https://${domain}/api/${apiVersion}/graphql.json`

// Le quattro chiamate che il sito fa davvero (src/commerce/shopify.js) e le
// sonde dei permessi che non usa. Ogni sonda chiede un campo che esiste solo
// con quello scope: se manca, Shopify risponde "Access denied ... access scope".
const RICHIESTI = [
  ['unauthenticated_read_product_listings', '{ products(first:1){ nodes { handle title } } }'],
  ['unauthenticated_read_content', '{ shop { privacyPolicy { title } } }'],
  ['unauthenticated_read_checkouts', '{ cart(id:"gid://shopify/Cart/inesistente"){ id } }'],
]
const NON_USATI = [
  ['unauthenticated_read_product_tags', '{ products(first:1){ nodes { tags } } }'],
  ['unauthenticated_read_product_inventory', '{ products(first:1){ nodes { variants(first:1){ nodes { quantityAvailable } } } } }'],
  ['unauthenticated_read_product_pickup_locations', '{ products(first:1){ nodes { variants(first:1){ nodes { storeAvailability(first:1){ nodes { available } } } } } } }'],
  ['unauthenticated_read_selling_plans', '{ products(first:1){ nodes { sellingPlanGroups(first:1){ nodes { name } } } } }'],
  ['unauthenticated_read_metaobjects', '{ metaobjects(type:"qualsiasi", first:1){ nodes { id } } }'],
  ['unauthenticated_read_customers', '{ customer(customerAccessToken:"non-valido"){ id } }'],
]

async function consentito(query) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': storefrontToken },
    body: JSON.stringify({ query }),
  })
  const body = await res.json().catch(() => ({}))
  const messaggi = (body.errors ?? []).map((e) => e.message ?? '')
  const negato = res.status === 403 || messaggi.some((m) => /access denied|access scope/i.test(m))
  if (negato) return { ok: false }
  if (messaggi.length) return { ok: false, inatteso: messaggi[0] }
  return { ok: true }
}

// `write_checkouts` non ha una query che lo riveli senza creare un carrello:
// lo copre e2e-phase8b, che un carrello lo crea davvero.
const problemi = []
console.log(`Negozio: ${domain} · API ${apiVersion}\n`)

console.log('Permessi che servono al sito:')
for (const [nome, query] of RICHIESTI) {
  const { ok, inatteso } = await consentito(query)
  console.log(`  ${ok ? 'ok     ' : 'MANCA  '}${nome}${inatteso ? ' — ' + inatteso : ''}`)
  if (!ok) problemi.push(`${nome}: serve al sito e il token non ce l'ha`)
}

console.log('\nPermessi che il sito non usa:')
for (const [nome, query] of NON_USATI) {
  const { ok, inatteso } = await consentito(query)
  if (inatteso) { console.log(`  ?      ${nome} — risposta non riconosciuta: ${inatteso}`); continue }
  console.log(`  ${ok ? 'ATTIVO ' : 'spento '}${nome}`)
  if (ok) problemi.push(`${nome}: attivo e non usato`)
}

console.log('\nNon sondabile: unauthenticated_write_customers (ogni prova e\' una scrittura sui clienti). Si legge dall\'amministrazione.')

if (problemi.length) {
  console.error(`\nScope: ${problemi.length} da sistemare`)
  for (const p of problemi) console.error(`  ${p}`)
  process.exit(1)
}
console.log('\nScope: il token puo\' fare esattamente quello che serve al sito')
