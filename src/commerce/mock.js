/**
 * Fornitore finto (Fase 8a): stesso contratto del fornitore Shopify (Fase 8b),
 * ma in memoria e in localStorage, con una latenza simulata. Serve a costruire e
 * provare carrello e interfaccia senza account, senza rete e senza pagamenti.
 * Il catalogo è ricavato da storeConfig: prezzi e taglie dimostrativi.
 */
const cents = (amount) => Math.round(amount * 100)

export function createMockProvider({ products, mock, maxQuantity, policyTitles = {}, fail = false }) {
  const catalog = new Map()
  const variants = new Map()
  for (const p of products) {
    if (!p.commerce?.handle) continue
    const entry = {
      handle: p.commerce.handle,
      title: p.name,
      variants: p.sizes.flatMap((size) => p.colorways.map((cw) => ({
        id: `mock:${p.id}:${size.id}:${cw.id}`,
        size: size.id,
        color: cw.id,
        price: { amount: p.price.amount, currency: p.price.currency },
        available: size.available,
      }))),
    }
    catalog.set(entry.handle, entry)
    for (const v of entry.variants) variants.set(v.id, { handle: entry.handle, title: entry.title, variant: v })
  }

  // I carrelli sopravvivono al ricaricamento come quelli di Shopify. Se lo
  // storage non è disponibile (navigazione privata), restano in memoria.
  let memory = {}
  const load = () => {
    try { return JSON.parse(localStorage.getItem(mock.storageKey) ?? '{}') } catch { return memory }
  }
  const save = (carts) => {
    memory = carts
    try { localStorage.setItem(mock.storageKey, JSON.stringify(carts)) } catch { /* resta in memoria */ }
  }
  const delay = () => new Promise((resolve) => setTimeout(resolve, mock.latencyMs))
  const guard = () => { if (fail) throw new Error('mock: errore simulato') }

  const view = (cart) => {
    const lines = cart.lines.map((l) => {
      const v = variants.get(l.variantId)
      return {
        id: l.id,
        variantId: l.variantId,
        quantity: l.quantity,
        merchandise: { productHandle: v.handle, title: v.title, size: v.variant.size, color: v.variant.color, price: v.variant.price },
      }
    })
    const currency = lines[0]?.merchandise.price.currency ?? products[0]?.price.currency
    const total = lines.reduce((sum, l) => sum + cents(l.merchandise.price.amount) * l.quantity, 0)
    return {
      id: cart.id,
      lines,
      totalQuantity: lines.reduce((n, l) => n + l.quantity, 0),
      subtotal: { amount: total / 100, currency },
      checkoutUrl: mock.checkoutUrl,
    }
  }

  const mutate = async (cartId, change) => {
    await delay()
    guard()
    const carts = load()
    const cart = carts[cartId]
    if (!cart) throw new Error('mock: carrello inesistente')
    change(cart)
    cart.lines = cart.lines.filter((l) => l.quantity > 0)
    save(carts)
    return view(cart)
  }

  return {
    name: 'mock',
    async getProducts(handles) {
      await delay()
      guard()
      return handles.filter((h) => catalog.has(h)).map((h) => catalog.get(h))
    },
    // Tutte le pagine legali configurate, con lo stesso testo segnaposto dichiarato.
    async getPolicies(policies) {
      await delay()
      guard()
      return policies.map((p) => ({ id: p.id, title: policyTitles[p.id] ?? p.id, body: mock.policyHtml }))
    },
    async createCart() {
      await delay()
      guard()
      const carts = load()
      const id = `mock-cart-${Object.keys(carts).length + 1}-${Date.now().toString(36)}`
      carts[id] = { id, lines: [] }
      save(carts)
      return view(carts[id])
    },
    async getCart(id) {
      await delay()
      guard()
      const cart = load()[id]
      return cart ? view(cart) : null
    },
    addLines: (cartId, lines) => mutate(cartId, (cart) => {
      for (const { variantId, quantity } of lines) {
        if (!variants.has(variantId)) throw new Error(`mock: variante ${variantId} inesistente`)
        if (!variants.get(variantId).variant.available) throw new Error('mock: variante esaurita')
        const line = cart.lines.find((l) => l.variantId === variantId)
        if (line) line.quantity = Math.min(maxQuantity, line.quantity + quantity)
        else cart.lines.push({ id: `line:${variantId}`, variantId, quantity: Math.min(maxQuantity, quantity) })
      }
    }),
    updateLines: (cartId, lines) => mutate(cartId, (cart) => {
      for (const { lineId, quantity } of lines) {
        const line = cart.lines.find((l) => l.id === lineId)
        if (line) line.quantity = Math.max(0, Math.min(maxQuantity, quantity))
      }
    }),
    removeLines: (cartId, lineIds) => mutate(cartId, (cart) => {
      cart.lines = cart.lines.filter((l) => !lineIds.includes(l.id))
    }),
  }
}
