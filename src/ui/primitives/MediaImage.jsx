import { useState } from 'react'
import { storeConfig } from '../../config/storeConfig.js'
import PlaceholderImage from './PlaceholderImage.jsx'

/** `srcset` di una foto pubblicata da `npm run media:build`: una voce per larghezza. */
export const mediaSrcSet = (src) => storeConfig.media.widths.map((w) => `${src}-${w}.webp ${w}w`).join(', ')
export const mediaUrl = (src, width) => `${src}-${width}.webp`

/**
 * Immagine di prodotto o di campagna.
 *
 * Con `media.src` mostra la foto (più larghezze, il browser sceglie con `sizes`), a
 * caricamento pigro salvo `eager`; finché non arriva c'è lo stato "loading" del
 * segnaposto, se non arriva lo stato "error". Senza `src` è il segnaposto dichiarato
 * di sempre. Il box ha la proporzione `ratio` (di default quella della foto) prima di
 * avere contenuto: nessuno spostamento del layout; la foto lo riempie ritagliata.
 */
export default function MediaImage(props) {
  // Un'altra foto nello stesso posto riparte da "loading", anche dopo un errore.
  return <Photo key={props.media.src ?? props.media.id} {...props} />
}

function Photo({
  media, ratio = media.ratio, sizes = '100vw', eager = false, label = media.label, category, seed, compact, className = '',
}) {
  const [state, setState] = useState('loading')
  const [w, h] = storeConfig.placeholders.ratios[ratio] ?? storeConfig.placeholders.ratios['1:1']

  if (!media.src || state === 'error') {
    return (
      <PlaceholderImage ratio={ratio} variant={media.variant} label={label} category={category} seed={seed}
                        compact={compact} className={className} state={media.src ? 'error' : 'placeholder'} />
    )
  }
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ aspectRatio: `${w} / ${h}` }}
         data-state={state === 'ready' ? 'photo' : 'loading'}>
      {state === 'loading' && (
        <PlaceholderImage ratio={ratio} variant={media.variant} state="loading" className="absolute inset-0 h-full w-full" />
      )}
      <img
        src={mediaUrl(media.src, storeConfig.media.widths[1])}
        srcSet={mediaSrcSet(media.src)}
        sizes={sizes}
        alt={label ?? ''}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        onLoad={() => setState('ready')}
        onError={() => setState('error')}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ opacity: state === 'ready' ? 1 : 0, transition: 'opacity 200ms' }}
      />
    </div>
  )
}
