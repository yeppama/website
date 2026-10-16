import { Component } from 'react'

/**
 * Rete di sicurezza attorno alla scena 3D. Un errore nel Canvas (contesto WebGL
 * che non si crea al montaggio o dopo "Riprova", modulo 3D che non si scarica)
 * senza questa barriera smonterebbe l'intera app lasciando la pagina vuota.
 * Qui la scena sparisce da sola e `onError` decide cosa mostrare. Si azzera
 * cambiando `key` (rimontaggio della scena).
 */
export default class SceneErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.error('scena 3D non disponibile', error)
    this.props.onError?.(error)
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}
