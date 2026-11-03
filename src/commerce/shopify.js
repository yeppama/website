/**
 * Fornitore Shopify (Fase 8b): Storefront API dal browser, con il token PUBBLICO
 * del canale Headless (pensato per stare nel codice del sito: legge il catalogo e
 * gestisce carrelli, non ordini né clienti). Il pagamento avviene sulla cassa di
 * Shopify (`checkoutUrl`): nessun dato di pagamento passa dal sito.
 *
 * Stesso contratto del fornitore finto (vedi commerce/index.js). Le varianti di
 * Shopify si traducono negli id di taglia e colore di storeConfig confrontando i
 * valori delle opzioni con le etichette (`sizes[].label`, `colorways[].label`).
 * `fetchImpl` si può sostituire nei test.
 */
const PRODUCT_FIELDS = `
  handle
  title
  variants(first: 100) {
    nodes {
      id
      availableForSale
      price { amount currencyCode }
      selectedOptions { name value }
    }
  }`

const CART_FIELDS = `
  id
  checkoutUrl
  totalQuantity
  cost { subtotalAmount { amount currencyCode } }
  lines(first: 100) {
    nodes {
      id
      quantity
      cost { totalAmount { amount currencyCode } }
      merchandise {
        ... on ProductVariant {
          id
          price { amount currencyCode }
          selectedOptions { name value }
          product { handle title }
        }
      }
    }
  }`

const money = (m) => ({ amount: Number(m.amount), currency: m.currencyCode })

export function createShopifyProvider({ products, shopify, country, language = null, fetchImpl = globalThis.fetch, timeoutMs = 10000 }) {
  const endpoint = `https://${shopify.domain}/api/${shopify.apiVersion}/graphql.json`
  const byHandle = new Map(products.filter((p) => p.commerce?.handle).map((p) => [p.commerce.handle, p]))
  const names = shopify.optionNames
  const match = (list, value) => list.some((n) => n.toLowerCase() === String(value).toLowerCase())

  // Taglia e colore di una variante Shopify, negli id di storeConfig.
  const optionsOf = (handle, selectedOptions) => {
    const product = byHandle.get(handle)
    const pick = (accepted) => selectedOptions.find((o) => match(accepted, o.name))?.value
    const sizeLabel = pick(names.size)
    const colorLabel = pick(names.color)
    const size = product?.sizes.find((s) => match([s.label], sizeLabel))?.id ?? null
    const color = product?.colorways.find((c) => match([c.label], colorLabel))?.id
      ?? (product?.colorways.length === 1 && colorLabel === undefined ? product.colorways[0].id : null)
    return { size, color }
  }

  async function request(query, variables = {}) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': shopify.storefrontToken,
        },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`shopify: HTTP ${res.status}`)
      const json = await res.json()
      if (json.errors?.length) throw new Error(`shopify: ${json.errors.map((e) => e.message).join('; ')}`)
      return json.data
    } finally {
      clearTimeout(timer)
    }
  }

  /**
   * L'URL della cassa finisce in window.location.assign (ui/cart/CartSheet.jsx):
   * è l'unico valore che arriva da fuori e diventa una navigazione. Oggi la
   * fonte è la Storefront API su HTTPS, quindi è attendibile; questo controllo
   * serve al giorno in cui non lo fosse — un negozio compromesso, un cambio
   * dell'API — perché un "javascript:" lì dentro verrebbe eseguito nel contesto
   * del sito. Se l'URL non convince, il carrello resta senza cassa: il bottone
   * "Vai al pagamento" si disabilita e dice perché (CartSheet), invece di
   * portare l'utente chissà dove.
   */
  // Host ammessi per la cassa: il negozio da cui arriva il carrello e, se il
  // config li elenca, i domini propri del negozio. Con un dominio personalizzato
  // Shopify restituisce il checkoutUrl sul dominio primario: senza la lista, alla
  // 8c la cassa si chiuderebbe in silenzio (audit 2026-11-02, T1-bis).
  const checkoutHosts = new Set([shopify.domain, ...(shopify.checkoutHosts ?? [])].map((h) => String(h).toLowerCase()))
  const safeCheckoutUrl = (raw) => {
    try {
      const url = new URL(String(raw))
      if (url.protocol === 'https:' && checkoutHosts.has(url.hostname)) return url.href
      console.warn('shopify: checkoutUrl scartato', url.protocol, url.hostname)
      return null
    } catch {
      return null
    }
  }

  const view = (cart) => ({
    id: cart.id,
    checkoutUrl: safeCheckoutUrl(cart.checkoutUrl),
    totalQuantity: cart.totalQuantity,
    subtotal: money(cart.cost.subtotalAmount),
    lines: cart.lines.nodes.map((l) => {
      const handle = l.merchandise.product.handle
      const { size, color } = optionsOf(handle, l.merchandise.selectedOptions)
      return {
        id: l.id,
        variantId: l.merchandise.id,
        quantity: l.quantity,
        // Totale di riga calcolato da Shopify (sconti compresi), non dal sito (T5).
        total: l.cost?.totalAmount ? money(l.cost.totalAmount) : null,
        merchandise: { productHandle: handle, title: l.merchandise.product.title, size, color, price: money(l.merchandise.price) },
      }
    }),
  })

  // Le mutazioni del carrello restituiscono userErrors (operazione rifiutata) e
  // warnings (operazione eseguita solo in parte: es. merce esaurita aggiunta con
  // quantità 0). Gli avvisi viaggiano col carrello: il chiamante non deve
  // confermare un'aggiunta che non c'è stata (Fase 8b, verificato dal vivo).
  const mutate = async (field, query, variables) => {
    const data = await request(query, { ...variables, country })
    const result = data[field]
    if (result.userErrors?.length) throw new Error(`shopify: ${result.userErrors.map((e) => e.message).join('; ')}`)
    return { ...view(result.cart), warnings: (result.warnings ?? []).map((w) => ({ code: w.code, message: w.message })) }
  }

  return {
    name: 'shopify',

    async getProducts(handles) {
      if (!handles.length) return []
      // Un alias per handle: una sola richiesta, nessuna sintassi di ricerca. Gli
      // handle viaggiano come variabili, mai dentro il testo della query
      // (mappa_dati_sicurezza §4; audit 2026-11-02, T18).
      const decl = handles.map((_, i) => `$h${i}: String!`).join(', ')
      const fields = handles.map((_, i) => `p${i}: product(handle: $h${i}) { ${PRODUCT_FIELDS} }`).join('\n')
      const vars = Object.fromEntries(handles.map((h, i) => [`h${i}`, h]))
      const data = await request(`query Products($country: CountryCode, ${decl}) @inContext(country: $country) {
        localization { availableCountries { isoCode } }
        ${fields}
      }`, { country, ...vars })
      // Un negozio che non vende nel paese configurato risponde col contesto del
      // suo mercato principale (prezzi in un'altra valuta) e poi dichiara la merce
      // esaurita al carrello. Meglio dirlo subito: il capo risulta non disponibile.
      const countries = data.localization.availableCountries.map((c) => c.isoCode)
      if (!countries.includes(country)) {
        throw new Error(`shopify: il negozio non vende in ${country} (mercati attivi: ${countries.join(', ')})`)
      }
      return handles.map((_, i) => data[`p${i}`]).filter(Boolean).map((p) => {
        const mapped = p.variants.nodes.map((v) => ({
          id: v.id,
          ...optionsOf(p.handle, v.selectedOptions),
          price: money(v.price),
          available: v.availableForSale,
        }))
        // Una variante la cui taglia o colore su Shopify non coincide con le
        // etichette del config ("Medium" invece di "M") sparisce dal sito: lo si
        // dice, altrimenti il capo sembra solo esaurito (audit 2026-11-02, T19).
        const dropped = mapped.filter((v) => !v.size || !v.color)
        if (dropped.length) console.warn(`shopify: ${dropped.length} varianti di ${p.handle} senza taglia/colore corrispondenti`, dropped.map((v) => v.id))
        return { handle: p.handle, title: p.title, variants: mapped.filter((v) => v.size && v.color) }
      })
    },

    createCart: () => mutate('cartCreate', `
      mutation CartCreate($country: CountryCode) @inContext(country: $country) {
        cartCreate(input: { buyerIdentity: { countryCode: $country } }) { cart { ${CART_FIELDS} } userErrors { message } warnings { code message } }
      }`, {}),

    async getCart(id) {
      const data = await request(`query Cart($id: ID!, $country: CountryCode) @inContext(country: $country) { cart(id: $id) { ${CART_FIELDS} } }`, { id, country })
      return data.cart ? view(data.cart) : null
    },

    addLines: (cartId, lines) => mutate('cartLinesAdd', `
      mutation Add($cartId: ID!, $lines: [CartLineInput!]!, $country: CountryCode) @inContext(country: $country) {
        cartLinesAdd(cartId: $cartId, lines: $lines) { cart { ${CART_FIELDS} } userErrors { message } warnings { code message } }
      }`, { cartId, lines: lines.map((l) => ({ merchandiseId: l.variantId, quantity: l.quantity })) }),

    updateLines: (cartId, lines) => mutate('cartLinesUpdate', `
      mutation Update($cartId: ID!, $lines: [CartLineUpdateInput!]!, $country: CountryCode) @inContext(country: $country) {
        cartLinesUpdate(cartId: $cartId, lines: $lines) { cart { ${CART_FIELDS} } userErrors { message } warnings { code message } }
      }`, { cartId, lines: lines.map((l) => ({ id: l.lineId, quantity: l.quantity })) }),

    // Pagine legali (preparazione della 8d): le scrive il venditore su Shopify. Si
    // chiedono nella lingua del sito; se il negozio non l'ha pubblicata, Shopify
    // risponde nella sua lingua predefinita (verificato dal vivo). Solo quelle con testo.
    async getPolicies(policies) {
      const fields = policies.map((p) => `${p.field} { title body }`).join(' ')
      const data = await request(`query Policies($country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) {
        shop { ${fields} }
      }`, { country, language })
      return policies
        .map((p) => ({ id: p.id, ...data.shop[p.field] }))
        .filter((p) => p.body?.trim())
        .map(({ id, title, body }) => ({ id, title, body }))
    },

    removeLines: (cartId, lineIds) => mutate('cartLinesRemove', `
      mutation Remove($cartId: ID!, $lineIds: [ID!]!, $country: CountryCode) @inContext(country: $country) {
        cartLinesRemove(cartId: $cartId, lineIds: $lineIds) { cart { ${CART_FIELDS} } userErrors { message } warnings { code message } }
      }`, { cartId, lineIds }),
  }
}
