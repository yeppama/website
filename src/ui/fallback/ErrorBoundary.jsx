import { Component } from 'react'
import { storeConfig } from '../../config/storeConfig.js'
import AlertOverlay from './AlertOverlay.jsx'

// Oltre questo numero di tentativi il guasto è stabile (GPU in blocklist, chunk
// che non arriva, voce di config incompleta): si smette di offrire "Riprova",
// che altrimenti ripresenta lo stesso errore a ogni click.
const MAX_RETRY = 2

/**
 * Error boundary — l'unico modo in React di non lasciare una pagina nera.
 *
 * Senza di lui un errore lanciato nel render si porta via tutto l'albero: il
 * chunk di three.js che non arriva su rete instabile, `new WebGLRenderer` che
 * fallisce anche se il probe WebGL2 era passato, un campo mancante nei contenuti
 * reali. Nessuno di questi casi è coperto da `WebGLFallback`, che risponde solo
 * al rilevamento "WebGL2 assente", né da Suspense, che gestisce l'attesa e non
 * l'errore.
 *
 * Deve essere una classe: in React 19 non esiste ancora l'equivalente a hook.
 */
export default class ErrorBoundary extends Component {
  state = { failed: false, attempts: 0 }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error, info) {
    // Non c'è un collettore di errori in produzione: la console è il solo posto
    // in cui l'errore resta leggibile da chi apre DevTools su un dispositivo vero.
    console.error('[errore non gestito]', error, info?.componentStack)
  }

  retry = () => {
    this.setState((s) => ({ failed: false, attempts: s.attempts + 1 }))
    this.props.onRetry?.()
  }

  render() {
    if (!this.state.failed) return this.props.children
    const copy = storeConfig.copy.errors.crash
    const canRetry = this.state.attempts < MAX_RETRY
    return (
      <AlertOverlay
        id={this.props.id ?? 'crash'}
        title={copy.title}
        body={copy.body}
        hint={canRetry ? undefined : copy.hint}
        retryLabel={copy.retry}
        onRetry={canRetry ? this.retry : undefined}
      />
    )
  }
}
