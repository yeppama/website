/**
 * Test del contratto dei fornitori di commercio, in Node, senza rete.
 *
 * Il fornitore Shopify riceve un `fetch` finto con risposte nel formato della
 * Storefront API: si verificano la richiesta (endpoint, token, contesto paese) e
 * la traduzione delle risposte. NON è una prova dal vivo: quella si fa sul negozio
 * di sviluppo (docs/PLAN-8.md, 8b).
 *
 *   npm run test:commerce
 */
import assert from 'node:assert/strict'
import { storeConfig } from '../src/config/storeConfig.js'
import { createShopifyProvider } from '../src/commerce/shopify.js'

const results = []
async function test(name, fn) {
  try { const note = await fn(); results.push(['ok', name, note ?? '']) }
  catch (e) { results.push(['FAIL', name, e.message]) }
}

const shopify = { ...storeConfig.commerce.shopify, domain: 'example.myshopify.com', storefrontToken: 'public-token' }
const variant = (id, size, color, available = true, amount = '189.0') => ({
  id, availableForSale: available, price: { amount, currencyCode: 'EUR' },
  selectedOptions: [{ name: 'Taglia', value: size }, { name: 'Colore', value: color }],
})
const cartNode = (lines) => ({
  id: 'gid://shopify/Cart/c1', checkoutUrl: 'https://example.myshopify.com/cart/c/c1', totalQuantity: lines.reduce((n, l) => n + l.quantity, 0),
  cost: { subtotalAmount: { amount: '378.0', currencyCode: 'EUR' } },
  lines: { nodes: lines.map((l) => ({ id: l.id, quantity: l.quantity, merchandise: { ...l.v, product: { handle: 'heavy-hoodie', title: 'Heavy Hoodie' } } })) },
})

// fetch finto: registra la richiesta e restituisce la risposta preparata.
function fakeFetch(respond) {
  const calls = []
  const fn = async (url, init) => {
    const body = JSON.parse(init.body)
    calls.push({ url, headers: init.headers, ...body })
    const r = respond(body)
    return { ok: r.status ? r.status < 400 : true, status: r.status ?? 200, json: async () => r.json ?? r }
  }
  return { fn, calls }
}

await test('richiesta: endpoint con versione, token pubblico nell\'header, paese nel contesto', async () => {
  const f = fakeFetch(() => ({ data: { p0: null } }))
  const p = createShopifyProvider({ products: storeConfig.products, shopify, country: 'IT', fetchImpl: f.fn })
  await p.getProducts(['heavy-hoodie'])
  const c = f.calls[0]
  assert.equal(c.url, `https://example.myshopify.com/api/${shopify.apiVersion}/graphql.json`)
  assert.equal(c.headers['X-Shopify-Storefront-Access-Token'], 'public-token')
  assert.equal(c.variables.country, 'IT')
  assert.match(c.query, /@inContext\(country: \$country\)/)
  assert.match(c.query, /p0: product\(handle: "heavy-hoodie"\)/)
})

await test('catalogo: varianti Shopify tradotte negli id di taglia e colore di storeConfig', async () => {
  const f = fakeFetch(() => ({ data: { p0: { handle: 'heavy-hoodie', title: 'Heavy Hoodie', variants: { nodes: [
    variant('gid://v/1', 'M', 'Black'), variant('gid://v/2', 'XS', 'Bone', false), variant('gid://v/3', 'XXL', 'Black'),
  ] } } } }))
  const p = createShopifyProvider({ products: storeConfig.products, shopify, country: 'IT', fetchImpl: f.fn })
  const [prod] = await p.getProducts(['heavy-hoodie'])
  assert.deepEqual(prod.variants.map((v) => [v.id, v.size, v.color, v.available, v.price.amount]),
    [['gid://v/1', 'm', 'cw-black', true, 189], ['gid://v/2', 'xs', 'cw-bone', false, 189]])
  return 'la taglia XXL, assente in storeConfig, viene scartata'
})

await test('catalogo: un capo assente su Shopify non compare (resterà "non disponibile")', async () => {
  const f = fakeFetch(() => ({ data: { p0: null, p1: { handle: 'box-tee', title: 'Box Tee', variants: { nodes: [variant('gid://v/9', 'M', 'Bone')] } } } }))
  const p = createShopifyProvider({ products: storeConfig.products, shopify, country: 'IT', fetchImpl: f.fn })
  const list = await p.getProducts(['heavy-hoodie', 'box-tee'])
  assert.deepEqual(list.map((x) => x.handle), ['box-tee'])
})

await test('carrello: aggiunta tradotta in CartLineInput, risposta nel formato del contratto', async () => {
  const v = variant('gid://v/1', 'M', 'Black')
  const f = fakeFetch((b) => ({ data: { cartLinesAdd: { cart: cartNode([{ id: 'gid://line/1', quantity: 2, v }]), userErrors: [] } } }))
  const p = createShopifyProvider({ products: storeConfig.products, shopify, country: 'IT', fetchImpl: f.fn })
  const cart = await p.addLines('gid://shopify/Cart/c1', [{ variantId: 'gid://v/1', quantity: 2 }])
  assert.deepEqual(f.calls[0].variables.lines, [{ merchandiseId: 'gid://v/1', quantity: 2 }])
  assert.equal(cart.totalQuantity, 2)
  assert.deepEqual(cart.subtotal, { amount: 378, currency: 'EUR' })
  assert.deepEqual(cart.lines[0].merchandise, { productHandle: 'heavy-hoodie', title: 'Heavy Hoodie', size: 'm', color: 'cw-black', price: { amount: 189, currency: 'EUR' } })
  assert.equal(cart.checkoutUrl, 'https://example.myshopify.com/cart/c/c1')
})

await test('errori: userErrors, errori GraphQL e HTTP diventano eccezioni', async () => {
  const cases = [
    () => ({ data: { cartLinesAdd: { cart: null, userErrors: [{ message: 'Esaurito' }] } } }),
    () => ({ errors: [{ message: 'Access denied' }] }),
    () => ({ status: 401, json: {} }),
  ]
  for (const respond of cases) {
    const p = createShopifyProvider({ products: storeConfig.products, shopify, country: 'IT', fetchImpl: fakeFetch(respond).fn })
    await assert.rejects(() => p.addLines('c', [{ variantId: 'v', quantity: 1 }]))
  }
})

await test('carrello scaduto: getCart restituisce null', async () => {
  const p = createShopifyProvider({ products: storeConfig.products, shopify, country: 'IT', fetchImpl: fakeFetch(() => ({ data: { cart: null } })).fn })
  assert.equal(await p.getCart('gid://shopify/Cart/old'), null)
})

for (const [s, n, note] of results) console.log(`${s === 'ok' ? '  ✓' : '  ✗'} ${n}${note ? ` — ${note}` : ''}`)
const failed = results.filter((r) => r[0] === 'FAIL').length
console.log(`\n${results.length - failed}/${results.length} test superati (contratto, senza rete: non è una prova dal vivo)`)
process.exit(failed ? 1 : 0)
