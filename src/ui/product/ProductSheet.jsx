import { useState } from 'react'
import { storeConfig } from '../../config/storeConfig.js'
import { formatPrice } from '../../lib/format.js'
import { useAppStore } from '../../state/useAppStore.js'
import { useCartStore } from '../../state/useCartStore.js'
import { commerceActive, commerceMode } from '../../commerce/index.js'
import PlaceholderImage from '../primitives/PlaceholderImage.jsx'
import Button from '../primitives/Button.jsx'
import OptionGroup from './OptionGroup.jsx'

/**
 * Scheda prodotto 2D. Senza commercio attivo, tutto da storeConfig e il bottone
 * d'acquisto è spento e dice perché. Con un fornitore (Fase 8: negozio di prova o
 * Shopify) prezzo, varianti e taglie disponibili vengono SOLO dal fornitore: se
 * non risponde il capo è "non disponibile", mai col prezzo di storeConfig.
 */
export default function ProductSheet({ product, headingId }) {
  const { copy, features, meta } = storeConfig
  const t = copy.product
  const openDialog = useAppStore((s) => s.openDialog)
  const [mediaId, setMediaId] = useState(product.media[0].id)
  const [colorwayId, setColorwayId] = useState(product.colorways[0].id)
  const [sizeId, setSizeId] = useState(null)

  const media = product.media.find((m) => m.id === mediaId)
  const colorway = product.colorways.find((c) => c.id === colorwayId)
  const size = product.sizes.find((s) => s.id === sizeId)
  const lookbooks = product.lookbookIds.map((id) => storeConfig.lookbook.find((l) => l.id === id))
  const checkout = features.checkout
  const tc = copy.cart

  // Commercio (Fase 8a)
  const active = commerceActive()
  const entry = useCartStore((s) => s.catalog[product.commerce?.handle])
  const catalogStatus = useCartStore((s) => s.catalogStatus)
  const pending = useCartStore((s) => s.pending)
  const cartError = useCartStore((s) => s.error)
  const add = useCartStore((s) => s.add)
  const [added, setAdded] = useState(false)
  const unavailable = active && (catalogStatus === 'error' || (catalogStatus === 'ready' && !entry))
  const inStock = (sid, cid) => (entry ? entry.variants.some((v) => v.size === sid && v.color === cid && v.available) : false)
  const sizeOptions = active && entry ? product.sizes.map((s) => ({ ...s, available: inStock(s.id, colorwayId) })) : product.sizes
  const variant = entry?.variants.find((v) => v.size === sizeId && v.color === colorwayId)
  const shownPrice = !active ? product.price
    : (variant ?? entry?.variants.find((v) => v.color === colorwayId))?.price ?? null

  const chooseColor = (id) => {
    setColorwayId(id)
    setAdded(false)
    // Una taglia esaurita nel nuovo colore non resta selezionata.
    if (active && entry && sizeId && !inStock(sizeId, id)) setSizeId(null)
  }
  const chooseSize = (id) => { setSizeId(id); setAdded(false) }
  const addToCart = async () => {
    if (!variant?.available) return
    if (await add(variant.id)) setAdded(true)
  }

  return (
    // Su telefono nome e prezzo vengono prima delle immagini, così stanno sopra la
    // piega; da tablet in su le immagini occupano la colonna sinistra per intero.
    <div className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:grid-rows-[auto_1fr] md:gap-x-8">
      <div className="md:col-start-2 md:row-start-1">
        {product.badges.length > 0 && (
          <ul className="mb-3 flex gap-2">
            {product.badges.map((b) => (
              <li key={b} className="micro border border-accent-flame px-2 py-0.5" style={{ color: 'var(--color-accent-flame)' }}>{b}</li>
            ))}
          </ul>
        )}
        <p className="micro">{product.category} · {product.collection} · {product.sku}</p>
        <h2 id={headingId} tabIndex={-1}
            className="mt-2 font-display font-black uppercase leading-none text-text-primary outline-none"
            style={{ fontSize: 'clamp(var(--text-xl), 8vw, var(--text-2xl))', letterSpacing: 'var(--tracking-tight)' }}>
          {product.name}
        </h2>
        <p className="mt-3 font-mono text-text-primary" style={{ fontSize: 'var(--text-lg)' }} data-testid="product-price">
          {shownPrice ? formatPrice(shownPrice, meta.brand.locale) : (unavailable ? '—' : '…')}
        </p>
      </div>

      <section aria-label={t.media} className="md:col-start-1 md:row-span-2 md:row-start-1">
        <PlaceholderImage
          ratio={media.ratio}
          variant={media.variant}
          label={`${media.label} · ${colorway.label}`}
          category={product.category}
          seed={`${product.id}-${media.id}-${colorway.id}`}
        />
        {product.media.length > 1 && (
          <ul className="mt-3 grid grid-cols-4 gap-2">
            {product.media.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  aria-pressed={m.id === mediaId}
                  aria-label={`${t.media}: ${m.label}`}
                  onClick={() => setMediaId(m.id)}
                  className={`block w-full border ${m.id === mediaId ? 'border-accent-flame' : 'border-transparent hover:border-line-strong'}`}
                >
                  <PlaceholderImage ratio="1:1" variant={m.variant} label={m.label} seed={`${product.id}-${m.id}`} compact />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-5 md:col-start-2 md:row-start-2">
        <p className="text-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>{product.description}</p>

        <OptionGroup
          label={`${t.colorways} · ${colorway.label}`}
          options={product.colorways}
          value={colorwayId}
          onChange={chooseColor}
          renderOption={(c) => (
            <>
              <span className="h-3 w-3 border border-line-strong" style={{ background: c.swatch }} aria-hidden="true" />
              {c.label}
            </>
          )}
        />

        <OptionGroup
          label={t.sizes}
          options={sizeOptions}
          value={sizeId}
          onChange={chooseSize}
          unavailableLabel={t.soldOut}
        />

        <div className="border-t border-line-subtle pt-4">
          <p className="micro" aria-live="polite" data-testid="product-selection">
            {t.selected}: {colorway.label} · {size ? size.label : t.chooseSize}
          </p>
          {active ? (
            <>
              <Button variant="primary" className="mt-3 w-full" onClick={addToCart}
                      disabled={unavailable || pending || !variant?.available} data-testid="add-to-cart">
                {pending ? tc.adding : !sizeId ? tc.chooseSize : variant && !variant.available ? tc.soldOut : tc.add}
              </Button>
              {unavailable && <p className="micro mt-3" role="alert" style={{ color: 'var(--color-state-danger)' }}>{tc.unavailable}</p>}
              {cartError && !unavailable && <p className="micro mt-3" role="alert" style={{ color: 'var(--color-state-danger)' }}>{cartError}</p>}
              {added && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="micro" role="status" style={{ color: 'var(--color-accent-flame)' }}>{tc.added}</p>
                  <Button onClick={() => openDialog('cart', 'cart')}>{tc.openCart} →</Button>
                </div>
              )}
              {commerceMode() === 'mock' && <p className="micro mt-3" style={{ color: 'var(--color-accent-flame)' }}>{tc.mockBanner}</p>}
            </>
          ) : (
            <Button variant="primary" className="mt-3 w-full" disabled={!checkout.enabled}>
              {`${copy.hints.comingInPhase} ${checkout.availableInPhase}`}
            </Button>
          )}
          <p className="micro mt-3" style={{ opacity: 0.7 }}>{copy.legal.priceNotice}</p>
        </div>

        <div>
          <p className="micro mb-2">{t.details}</p>
          <ul className="grid gap-1 text-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
            {product.details.map((d) => <li key={d}>— {d}</li>)}
          </ul>
        </div>

        {features.lookbook.enabled && lookbooks.length > 0 && (
          <div>
            <p className="micro mb-2">{t.inLookbook}</p>
            <div className="flex flex-wrap gap-2">
              {lookbooks.map((l) => (
                <Button key={l.id} onClick={() => openDialog('lookbook', l.id)}>{l.title} →</Button>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
