import { useAppStore } from './useAppStore.js'

/**
 * Tasto Indietro del browser (telefono e computer) come "Indietro" del sito.
 *
 * Senza questo, Indietro con una scheda aperta lasciava il sito (e alcuni browser
 * chiedono conferma prima di farlo). Ogni livello aperto (scheda della pila, menu,
 * Focus) ha una sua voce nella cronologia: Indietro toglie il livello più in alto,
 * e chiudere un livello coi bottoni del sito toglie la sua voce, così la cronologia
 * resta allineata. Con nessun livello aperto, Indietro fa quello che fa sempre.
 */
const layersOf = (s) => s.dialogs.length + (s.menuOpen ? 1 : 0) +
  (s.focus.state === 'entering' || s.focus.state === 'focused' ? 1 : 0)

/**
 * Voci orfane: una ricarica (o un ritorno dalla cassa senza bfcache) con un livello
 * aperto lascia la pagina su una voce `{ intoLayer: n }`, ma lo stato del sito
 * riparte senza livelli. Il primo Indietro atterrava sulla voce della pagina e
 * non faceva niente; ne servivano due per uscire (verificato il 2026-10-30).
 * All'avvio si torna in silenzio alla voce della pagina: le voci orfane restano
 * solo "avanti" e spariscono al primo pushState (audit 2026-11-02, N8).
 *
 * Si chiama una volta, all'avvio dell'app, prima che esista l'ascoltatore di
 * popstate: il popstate che segue non trova nessuno che lo tratti come Indietro.
 */
let dropped = false   // una volta sola: StrictMode ripete gli effetti, e history.go è asincrono
export function dropOrphanEntries() {
  if (dropped) return
  dropped = true
  const n = history.state?.intoLayer
  if (Number.isInteger(n) && n > 0) history.go(-n)
}

export function installBackButton() {
  let depth = 0     // voci nostre sopra quella della pagina
  let ignore = 0    // ritorni provocati da noi (history.go), da non trattare come Indietro

  const sync = (s) => {
    const want = layersOf(s)
    while (depth < want) { depth += 1; history.pushState({ intoLayer: depth }, '') }
    if (want < depth) {
      ignore += 1
      history.go(want - depth)
      depth = want
    }
  }

  const onPop = () => {
    if (ignore) { ignore -= 1; return }
    // Il browser ha già tolto una voce: si chiude il livello in cima.
    depth = Math.max(0, depth - 1)
    const s = useAppStore.getState()
    if (s.dialogs.length) s.backDialog()
    else if (s.menuOpen) s.closeMenu()
    else s.exitFocus()
  }

  window.addEventListener('popstate', onPop)
  const unsubscribe = useAppStore.subscribe(sync)
  sync(useAppStore.getState())
  return () => { unsubscribe(); window.removeEventListener('popstate', onPop) }
}
