import { storeConfig } from '../../config/storeConfig.js'
import { useAppStore } from '../../state/useAppStore.js'
import { useCartStore } from '../../state/useCartStore.js'
import Button from '../primitives/Button.jsx'

/**
 * Accesso al carrello dall'HUD e dal menu, col numero di pezzi. Sotto i 400 px la
 * parola lascia il posto a una borsa disegnata col tratto dei bottoni: con "Menu"
 * accanto, a 320 px la parola usciva dallo schermo. Il nome viene dal testo del
 * bottone ("Carrello 0"): un aria-label uguale a parole ma diverso nei nodi
 * ("Carrello" e "0" attaccati) faceva scattare axe su WCAG 2.5.3.
 */
export default function CartButton({ className = '' }) {
  const count = useCartStore((s) => s.cart?.totalQuantity ?? 0)
  const openDialog = useAppStore((s) => s.openDialog)
  const t = storeConfig.copy.cart
  return (
    <Button className={className} onClick={() => openDialog('cart', 'cart')} data-testid="cart-button">
      <svg className="hidden h-4 w-4 [@media(max-width:400px)]:block" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M3 5.5h10l-.8 8.5H3.8z" /><path d="M5.5 5.5V4a2.5 2.5 0 0 1 5 0v1.5" />
      </svg>
      {/* Sotto i 400 px la parola si nasconde alla vista ma resta nel nome: il nome
          viene dal testo, "Carrello 0", senza un aria-label che lo ripeta diverso. */}
      <span className="[@media(max-width:400px)]:sr-only">{t.open}</span>{' '}
      <span className="font-mono" style={{ color: count ? 'var(--color-accent-flame)' : undefined }}>{count}</span>
    </Button>
  )
}
