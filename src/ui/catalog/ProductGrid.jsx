import { storeConfig } from '../../config/storeConfig.js'
import { useAppStore } from '../../state/useAppStore.js'
import { useShownPrice } from '../../state/useCartStore.js'
import { commerceActive } from '../../commerce/index.js'
import MediaImage from '../primitives/MediaImage.jsx'

/**
 * Indice dei capi: prima foto, nome, codice e prezzo (dal fornitore se il commercio
 * è attivo). Usato dal menu del negozio 3D e dalla modalità testo, così i due
 * elenchi non possono divergere. Ogni capo apre la sua scheda.
 */
export default function ProductGrid({ columns = 'grid-cols-2' }) {
  const openDialog = useAppStore((s) => s.openDialog)
  const disabled = !storeConfig.features.productModal.enabled
  return (
    <>
      <div className={`grid ${columns} gap-3`}>
        {storeConfig.products.map((product) => (
          <ProductCard key={product.id} product={product} disabled={disabled}
                       onOpen={() => openDialog('product', product.id)} />
        ))}
      </div>
      {!commerceActive() && <p className="micro mt-4">{storeConfig.copy.legal.priceNotice}</p>}
    </>
  )
}

function ProductCard({ product, disabled, onOpen }) {
  const { label } = useShownPrice(product)
  return (
    <article>
      <button type="button" className="group block w-full text-left" disabled={disabled} onClick={onOpen}>
        <MediaImage media={product.media[0]} ratio={storeConfig.media.productRatio} category={product.category}
                    seed={product.id} sizes="(min-width: 640px) 12rem, 45vw" />
        <span className="mt-2 block font-display font-bold uppercase text-text-primary group-hover:text-accent-flame"
              style={{ fontSize: 'var(--text-sm)', letterSpacing: 'var(--tracking-tight)' }}>
          {product.name}
        </span>
        <span className="micro mt-0.5 block" data-testid="menu-price">
          {product.sku} · {label}
        </span>
      </button>
    </article>
  )
}
