/**
 * Controllo DAL VIVO fra il negozio 3D (storeConfig) e un negozio Shopify: è il criterio
 * di chiusura della Fase 8c ("ogni capo del negozio 3D corrisponde a un prodotto Shopify").
 *
 *   npm run check:catalog -- [--domain x.myshopify.com --token <pubblico>] [--country IT] [--launch]
 *
 * Senza --domain/--token usa il negozio di storeConfig.commerce.shopify (o VITE_SHOPIFY_*).
 * Verifica: mercato e valuta; per ogni capo il prodotto (pubblicato sul canale Headless),
 * le opzioni Taglia/Colore e una variante per ogni taglia × colore; i prodotti su Shopify
 * che il negozio 3D non mostra; le pagine legali. Con --launch le pagine legali mancanti
 * sono errori (Fase 8e), altrimenti avvisi. Esce con 1 se ci sono errori.
 */
import { spawnSync } from 'node:child_process'
import { storeConfig } from '../../src/config/storeConfig.js'

// Dietro un proxy (container di sviluppo) il fetch di Node lo usa solo con questa variabile.
if (process.env.HTTPS_PROXY && process.env.NODE_USE_ENV_PROXY !== '1') {
  const r = spawnSync(process.execPath, ['--no-warnings', ...process.argv.slice(1)],
    { stdio: 'inherit', env: { ...process.env, NODE_USE_ENV_PROXY: '1' } })
  process.exit(r.status ?? 1)
}

const args = process.argv.slice(2)
const arg = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined }
const { commerce, products, meta } = storeConfig
const domain = arg('domain') ?? process.env.VITE_SHOPIFY_DOMAIN ?? commerce.shopify.domain
const token = arg('token') ?? process.env.VITE_SHOPIFY_STOREFRONT_TOKEN ?? commerce.shopify.storefrontToken
const apiVersion = process.env.VITE_SHOPIFY_API_VERSION ?? commerce.shopify.apiVersion
const country = arg('country') ?? commerce.country
const language = meta.brand.locale.slice(0, 2).toUpperCase()
const launch = args.includes('--launch')
const names = commerce.shopify.optionNames
const currency = meta.brand.currency

const errors = []
const warnings = []
const oks = []
const same = (a, b) => String(a).localeCompare(String(b), 'it', { sensitivity: 'accent' }) === 0
const isOption = (accepted, name) => accepted.some((n) => same(n, name))

const handles = products.map((p) => p.commerce?.handle).filter(Boolean)
const PRODUCT = `handle title
  options { name optionValues { name } }
  variants(first: 250) { nodes { availableForSale price { amount currencyCode } selectedOptions { name value } } }`
const query = `query Check($country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) {
  localization { availableCountries { isoCode currency { isoCode } } language { isoCode } }
  shop { name ${commerce.policies.map((p) => `${p.field} { title body }`).join(' ')} }
  all: products(first: 250) { nodes { handle } }
  ${handles.map((h, i) => `p${i}: product(handle: ${JSON.stringify(h)}) { ${PRODUCT} }`).join('\n')}
}`

const res = await fetch(`https://${domain}/api/${apiVersion}/graphql.json`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': token },
  body: JSON.stringify({ query, variables: { country, language } }),
}).catch((e) => { console.error(`✗ ${domain} non raggiungibile: ${e.cause?.code ?? e.message}`); process.exit(1) })
if (!res.ok) { console.error(`✗ ${domain}: HTTP ${res.status} (token sbagliato o negozio inesistente?)`); process.exit(1) }
const json = await res.json()
if (json.errors?.length) { console.error(`✗ ${domain}: ${json.errors.map((e) => e.message).join('; ')}`); process.exit(1) }
const data = json.data

// ── Mercato ──
const market = data.localization.availableCountries.find((c) => c.isoCode === country)
if (!market) errors.push(`Il negozio non vende in ${country} (mercati: ${data.localization.availableCountries.map((c) => c.isoCode).join(', ')}).`)
else if (market.currency.isoCode !== currency) errors.push(`In ${country} la valuta è ${market.currency.isoCode}, il sito usa ${currency}.`)
else oks.push(`Mercato ${country} in ${currency}`)
if (data.localization.language.isoCode !== language) warnings.push(`Lingua ${language} non pubblicata: Shopify risponde in ${data.localization.language.isoCode} (cassa e pagine legali in quella lingua).`)
else oks.push(`Lingua ${language}`)

// ── Capi ──
products.forEach((p, i) => {
  const h = p.commerce?.handle
  const sp = data[`p${handles.indexOf(h)}`]
  const tag = `${p.name} (${h})`
  if (!sp) { errors.push(`${tag}: nessun prodotto con questo handle, o non pubblicato sul canale Headless.`); return }
  const sizeOpt = sp.options.find((o) => isOption(names.size, o.name))
  const colorOpt = sp.options.find((o) => isOption(names.color, o.name))
  if (!sizeOpt) { errors.push(`${tag}: manca l'opzione taglia (${names.size.join(' o ')}).`); return }
  if (!colorOpt && p.colorways.length > 1) { errors.push(`${tag}: manca l'opzione colore (${names.color.join(' o ')}) e il capo ha ${p.colorways.length} colori.`); return }

  const opt = (v, accepted) => v.selectedOptions.find((o) => isOption(accepted, o.name))?.value
  const missing = []
  for (const s of p.sizes) for (const c of p.colorways) {
    const v = sp.variants.nodes.find((v) => same(opt(v, names.size), s.label) && (!colorOpt || same(opt(v, names.color), c.label)))
    if (!v) missing.push(`${s.label}/${c.label}`)
    else if (v.price.currencyCode !== currency) errors.push(`${tag} ${s.label}/${c.label}: prezzo in ${v.price.currencyCode}, non in ${currency}.`)
  }
  if (missing.length) errors.push(`${tag}: varianti mancanti su Shopify: ${missing.join(', ')}.`)
  const extra = sp.variants.nodes.filter((v) => !p.sizes.some((s) => same(s.label, opt(v, names.size)))
    || (colorOpt && !p.colorways.some((c) => same(c.label, opt(v, names.color)))))
  if (extra.length) warnings.push(`${tag}: ${extra.length} varianti su Shopify che il negozio 3D non mostra (${extra.map((v) => v.selectedOptions.map((o) => o.value).join('/')).join(', ')}).`)
  const sold = sp.variants.nodes.filter((v) => !v.availableForSale).length
  if (!missing.length) oks.push(`${tag}: ${sp.variants.nodes.length} varianti${sold ? `, ${sold} esaurite` : ''}`)
})
const extraProducts = data.all.nodes.map((n) => n.handle).filter((h) => !handles.includes(h))
if (extraProducts.length) warnings.push(`Su Shopify ma non nel negozio 3D: ${extraProducts.join(', ')}.`)

// ── Pagine legali ──
const missingPolicies = commerce.policies.filter((p) => !data.shop[p.field]?.body?.trim())
for (const p of missingPolicies) (launch ? errors : warnings).push(`Pagina legale mancante su Shopify: ${storeConfig.copy.legal.policies[p.id]}.`)
const present = commerce.policies.length - missingPolicies.length
if (present) oks.push(`Pagine legali pubblicate: ${present} su ${commerce.policies.length}`)

console.log(`Negozio ${data.shop.name} (${domain}) · paese ${country} · lingua ${language}${launch ? ' · controllo di lancio' : ''}\n`)
for (const m of oks) console.log(`  ✓ ${m}`)
for (const m of warnings) console.log(`  ! ${m}`)
for (const m of errors) console.log(`  ✗ ${m}`)
console.log(`\n${errors.length ? 'NON allineato' : 'Allineato'}: ${errors.length} errori, ${warnings.length} avvisi`)
process.exit(errors.length ? 1 : 0)
