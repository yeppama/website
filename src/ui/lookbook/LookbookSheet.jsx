import { useState } from 'react'
import { storeConfig } from '../../config/storeConfig.js'
import { pad2 } from '../../lib/format.js'
import { useAppStore } from '../../state/useAppStore.js'
import { useShownPrice } from '../../state/useCartStore.js'
import MediaImage from '../primitives/MediaImage.jsx'
import Button from '../primitives/Button.jsx'

/**
 * Lookbook / Brand Story. Il racconto della collezione da `lookbook`, i dati del
 * marchio da `meta.brand`: origine, coordinate, credito, tagline. È l'unico posto
 * della UI, con l'onboarding, dove il gotico entra come titolo.
 * Galleria navigabile con bottoni e frecce; i capi del look aprono la loro scheda.
 */
export default function LookbookSheet({ entry, headingId }) {
  const { brand } = storeConfig.meta
  const t = storeConfig.copy.lookbook
  const openDialog = useAppStore((s) => s.openDialog)
  const [index, setIndex] = useState(0)
  const images = entry.images
  const image = images[index]
  const products = entry.productIds.map((id) => storeConfig.products.find((p) => p.id === id))
  const [fw, fh] = storeConfig.placeholders.galleryFrame
  const [iw, ih] = storeConfig.placeholders.ratios[image.ratio]
  // Più larga della cornice → riempie in larghezza; altrimenti in altezza.
  const wide = iw / ih > fw / fh
  const go = (delta) => setIndex((i) => (i + delta + images.length) % images.length)

  const onGalleryKey = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1) }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1) }
  }

  return (
    <div className="grid gap-8 short:gap-4">
      <header>
        <p className="micro">{t.eyebrow} · {entry.season} · {brand.name}</p>
        <h2 id={headingId} tabIndex={-1}
            className="mt-3 font-gothic leading-none text-text-primary outline-none"
            style={{ fontSize: 'clamp(var(--text-2xl), min(9vw, 14vh), var(--text-3xl))' }}>
          {entry.title}
        </h2>
        <p className="mt-2 font-display font-bold uppercase text-text-secondary"
           style={{ fontSize: 'var(--text-sm)', letterSpacing: 'var(--tracking-brutal)' }}>
          {entry.subtitle}
        </p>
      </header>

      <section aria-roledescription={t.galleryRole} aria-label={t.gallery} onKeyDown={onGalleryKey}>
        {/* Il box non cambia altezza fra un'immagine e l'altra: i ratio diversi
            stanno dentro una cornice fissa, così i bottoni non saltano. */}
        {/* Su schermo basso la cornice si misura sull'altezza disponibile. */}
        <div className="flex items-center justify-center border border-line-subtle bg-bg-base short:mx-auto short:w-[calc(var(--sheet-frame-h)_*_var(--frame-ratio))] short:max-w-full"
             data-testid="lookbook-frame"
             style={{ aspectRatio: `${fw} / ${fh}`, '--frame-ratio': fw / fh }}>
          <MediaImage
            key={image.id}
            media={image}
            seed={`${entry.id}-${image.id}`}
            sizes="(min-width: 1024px) 60rem, 100vw"
            eager
            className={wide ? 'w-full' : 'h-full'}
          />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <Button onClick={() => go(-1)} aria-label={t.previous}>←</Button>
          <p className="micro" aria-live="polite" data-testid="lookbook-counter">
            {t.image} {pad2(index + 1)} / {pad2(images.length)} · {image.label}
          </p>
          <Button onClick={() => go(1)} aria-label={t.next}>→</Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:gap-8">
        <div className="grid gap-3 text-text-secondary" style={{ fontSize: 'var(--text-base)' }}>
          {entry.body.map((p) => <p key={p}>{p}</p>)}
        </div>
        <aside className="border-t border-line-subtle pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
          <p className="font-display font-black uppercase text-text-primary"
             style={{ fontSize: 'var(--text-lg)', letterSpacing: 'var(--tracking-tight)' }}>
            {brand.tagline}
          </p>
          <div className="rule my-4" />
          <p className="micro">{t.origin}</p>
          <p className="micro mt-1 text-text-primary">{brand.origin.city}, {brand.origin.country}</p>
          <p className="micro mt-1">{brand.origin.coords}</p>
          <p className="micro mt-4">{brand.credit}</p>
        </aside>
      </section>

      {storeConfig.features.productModal.enabled && products.length > 0 && (
        <section>
          <h3 className="micro mb-3" style={{ color: 'var(--color-accent-flame)' }}>{t.products}</h3>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {products.map((p) => (
              <li key={p.id}><LookProduct product={p} onOpen={() => openDialog('product', p.id)} /></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

/** Capo del look: prima foto, nome e prezzo (dal fornitore se il commercio è attivo). */
function LookProduct({ product, onOpen }) {
  const { label } = useShownPrice(product)
  return (
    <button type="button" onClick={onOpen} className="group block w-full text-left">
      <MediaImage media={product.media[0]} ratio={storeConfig.media.productRatio} category={product.category}
                  seed={product.id} sizes="(min-width: 640px) 14rem, 45vw" />
      <span className="mt-2 block font-display font-bold uppercase text-text-primary group-hover:text-accent-flame"
            style={{ fontSize: 'var(--text-sm)', letterSpacing: 'var(--tracking-tight)' }}>
        {product.name}
      </span>
      <span className="micro mt-0.5 block">{label}</span>
    </button>
  )
}
