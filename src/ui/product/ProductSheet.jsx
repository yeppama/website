import { useEffect, useState } from 'react'
import { storeConfig } from '../../config/storeConfig.js'
import { formatPrice } from '../../lib/format.js'
import { useAppStore } from '../../state/useAppStore.js'
import { useCartStore } from '../../state/useCartStore.js'
import { commerceActive, testBanner } from '../../commerce/index.js'
import MediaImage from '../primitives/MediaImage.jsx'
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

  // Le foto legate a un colore (media[].colorwayId) compaiono solo con quel colore.
  const visibleMedia = product.media.filter((m) => !m.colorwayId || m.colorwayId === colorwayId)
  const media = visibleMedia.find((m) => m.id === mediaId) ?? visibleMedia[0]
  const [mw, mh] = storeConfig.placeholders.ratios[media.ratio]
  const [pw, ph] = storeConfig.placeholders.productFrame
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
  const loadCatalog = useCartStore((s) => s.loadCatalog)
  // Aprendo la scheda: niente errori rimasti da un altro capo, e un catalogo
  // andato in errore si riprova invece di restare spento per tutta la visita.
  useEffect(() => {
    if (!active) return
    useCartStore.getState().clearError()
    if (useCartStore.getState().catalogStatus === 'error') loadCatalog()
  }, [active, loadCatalog])
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
    // Sulla foto del colore nuovo, se ne ha una sua.
    const own = product.media.find((m) => m.colorwayId === id)
    if (own) setMediaId(own.id)
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
    // Su schermo basso (telefono in orizzontale) l'immagine si misura sull'altezza e
    // resta ferma a sinistra; a destra vengono prima colori, taglie e acquisto.
    <div className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:grid-rows-[auto_1fr] md:gap-x-8 short:grid-cols-[auto_minmax(0,1fr)] short:grid-rows-[auto_1fr] short:gap-x-6 short:gap-y-2">
      <div className="md:col-start-2 md:row-start-1 short:col-start-2 short:row-start-1">
        {/* Su schermo basso etichette e codici stanno su una riga sola. */}
        <div className="short:flex short:flex-wrap short:items-center short:gap-x-3">
          {product.badges.length > 0 && (
            <ul className="mb-3 flex gap-2 short:mb-0">
              {product.badges.map((b) => (
                <li key={b} className="micro border border-accent-flame px-2 py-0.5" style={{ color: 'var(--color-accent-flame)' }}>{b}</li>
              ))}
            </ul>
          )}
          <p className="micro">{product.category} · {product.collection} · {product.sku}</p>
        </div>
        <h2 id={headingId} tabIndex={-1}
            className="mt-2 font-display font-black uppercase leading-none text-text-primary outline-none short:mt-1.5"
            style={{ fontSize: 'clamp(var(--text-xl), min(8vw, 9vh), var(--text-2xl))', letterSpacing: 'var(--tracking-tight)' }}>
          {product.name}
        </h2>
        <p className="mt-3 font-mono text-text-primary short:mt-1" style={{ fontSize: 'var(--text-lg)' }} data-testid="product-price">
          {shownPrice ? formatPrice(shownPrice, meta.brand.locale) : (unavailable ? '—' : '…')}
        </p>
      </div>

      <section aria-label={t.media} data-testid="product-media"
               style={{ '--frame-ratio': pw / ph }}
               className="md:col-start-1 md:row-span-2 md:row-start-1 short:sticky short:top-0 short:col-start-1 short:row-span-2 short:row-start-1 short:w-[calc(var(--sheet-frame-h)_*_var(--frame-ratio))] short:self-start">
        <div className="short:flex short:h-(--sheet-frame-h) short:items-center short:justify-center">
          <MediaImage
            media={media}
            label={`${media.label} · ${colorway.label}`}
            category={product.category}
            seed={`${product.id}-${media.id}-${colorway.id}`}
            sizes="(min-width: 768px) 50vw, 100vw"
            eager
            className={mw / mh < pw / ph ? 'short:h-full' : 'short:w-full'}
          />
        </div>
        {visibleMedia.length > 1 && (
          <ul className="mt-3 grid grid-cols-4 gap-2 short:mt-2 short:grid-cols-[repeat(auto-fill,minmax(var(--touch-min),1fr))] short:gap-1">
            {visibleMedia.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  aria-pressed={m.id === media.id}
                  aria-label={`${t.media}: ${m.label}`}
                  onClick={() => setMediaId(m.id)}
                  className={`block w-full border ${m.id === media.id ? 'border-accent-flame' : 'border-transparent hover:border-line-strong'}`}
                >
                  <MediaImage media={m} ratio="1:1" seed={`${product.id}-${m.id}`} sizes="6rem" compact />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-5 md:col-start-2 md:row-start-2 short:col-start-2 short:row-start-2 short:gap-2">
        <p className="text-text-secondary short:order-1" style={{ fontSize: 'var(--text-sm)' }}>{product.description}</p>

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
              {unavailable && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="micro" role="alert" style={{ color: 'var(--color-state-danger)' }}>{tc.unavailable}</p>
                  {catalogStatus === 'error' && <Button onClick={loadCatalog}>{tc.retry}</Button>}
                </div>
              )}
              {cartError && !unavailable && <p className="micro mt-3" role="alert" style={{ color: 'var(--color-state-danger)' }}>{cartError}</p>}
              {added && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="micro" role="status" style={{ color: 'var(--color-accent-flame)' }}>{tc.added}</p>
                  <Button onClick={() => openDialog('cart', 'cart')}>{tc.openCart} →</Button>
                </div>
              )}
              {testBanner() && <p className="micro mt-3" style={{ color: 'var(--color-accent-flame)' }}>{testBanner()}</p>}
            </>
          ) : (
            <Button variant="primary" className="mt-3 w-full" disabled={!checkout.enabled}>
              {t.purchaseClosed}
            </Button>
          )}
          {!active && <p className="micro mt-3" style={{ opacity: 0.7 }}>{copy.legal.priceNotice}</p>}
        </div>

        <div className="short:order-2">
          <p className="micro mb-2">{t.details}</p>
          <ul className="grid gap-1 text-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
            {product.details.map((d) => <li key={d}>— {d}</li>)}
          </ul>
        </div>

        {features.lookbook.enabled && lookbooks.length > 0 && (
          <div className="short:order-2">
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
