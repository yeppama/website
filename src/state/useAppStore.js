import { create } from 'zustand'

/**
 * Stato condiviso fra la UI 2D e la scena 3D.
 *
 * Zustand e non Context: la posizione del player cambierà 60 volte al secondo
 * (Fase 3) e con Context ogni cambio ri-renderizzerebbe tutti i consumer.
 * Qui ciascun componente si sottoscrive solo al campo che usa.
 */
export const APP_PHASE = {
  BOOT: 'boot',             // probe WebGL in corso
  ONBOARDING: 'onboarding', // istruzioni, in attesa del gesto d'ingresso
  LOADING: 'loading',       // asset della scena in caricamento
  EXPLORING: 'exploring',   // esperienza attiva
  UNSUPPORTED: 'unsupported',
  TEXT: 'text',             // modalità testo: catalogo e schede senza la scena
}

// Comandi da computer scelti all'ingresso: 'keyboard' (WASD + cursore catturato) o
// 'mouse' (trascina per guardare, click per andare, come su telefono). Ricordati dal
// browser per la visita dopo; senza memoria disponibile si riparte da 'keyboard'.
const CONTROL_KEY = 'into-control-mode'
// Contatore e non Date.now(): due messaggi nello stesso millisecondo avrebbero lo
// stesso id e il timer del primo cancellerebbe il secondo (T17).
let noticeSeq = 0
const readControl = () => { try { return localStorage.getItem(CONTROL_KEY) === 'mouse' ? 'mouse' : 'keyboard' } catch { return 'keyboard' } }

export const useAppStore = create((set, get) => ({
  phase: APP_PHASE.BOOT,
  device: null,          // popolato da useDeviceProfile
  menuOpen: false,
  activeZoneId: null,
  activeShotId: null,    // inquadratura statica corrente (Fase 2)
  reducedMotion: false,
  loadStage: 'boot',
  notice: null,          // messaggio breve mostrato sopra la scena
  controlMode: readControl(),

  // Focus Mode (Fase 4) — macchina a stati:
  //   idle → entering → focused → exiting → idle
  // L'uscita è sempre possibile, anche durante l'ingresso: si parte dalla posa
  // in cui si trova la camera in quel momento, senza aspettare la fine.
  focus: { state: 'idle', displayId: null, productIndex: 0, returnPose: null },
  // Rettangolo del pannello del Focus sullo schermo ({ left, top, right, bottom } in
  // pixel CSS), o null: la camera inquadra il capo nella parte che il pannello lascia libera.
  focusPanelRect: null,

  // Finestre di dialogo (Fase 5) — una pila: [{ kind: 'product' | 'lookbook', id }].
  // Dal Lookbook si apre un capo e "Indietro" riporta al Lookbook; "Chiudi"
  // svuota la pila. Finché la pila non è vuota il player è sospeso.
  dialogs: [],

  // Fase 6: contesto WebGL perso (overlay di ripristino) e benchmark in corso
  // (l'input dell'utente è ignorato, il percorso lo guida lo script).
  gpuLost: false,
  benchRunning: false,

  setPhase: (phase) => set({ phase }),
  setControlMode: (controlMode) => {
    try { localStorage.setItem(CONTROL_KEY, controlMode) } catch { /* solo per questa visita */ }
    set({ controlMode })
  },
  setDevice: (device) => set({ device }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setActiveZone: (activeZoneId) => set({ activeZoneId }),
  // Un'inquadratura porta con sé la sua zona: HUD e minimappa restano coerenti.
  setShot: (shot) => set({ activeShotId: shot.id, activeZoneId: shot.zoneId }),
  setLoadStage: (loadStage) => set({ loadStage }),

  // Un solo messaggio alla volta, che si nasconde da solo. `id` evita che un
  // timer vecchio cancelli un messaggio più recente.
  showNotice: (text, ms = 2600) => {
    const id = ++noticeSeq
    set({ notice: { id, text } })
    setTimeout(() => { if (get().notice?.id === id) set({ notice: null }) }, ms)
  },

  toggleMenu: () => set({ menuOpen: !get().menuOpen }),
  closeMenu: () => set({ menuOpen: false }),

  enterFocus: (displayId, returnPose) => {
    if (get().focus.state !== 'idle') return
    set({ focus: { state: 'entering', displayId, productIndex: 0, returnPose }, menuOpen: false })
  },
  exitFocus: () => {
    const f = get().focus
    if (f.state === 'entering' || f.state === 'focused') set({ focus: { ...f, state: 'exiting' } })
  },
  setFocusState: (state) => set((s) => ({ focus: { ...s.focus, state } })),
  setFocusPanelRect: (focusPanelRect) => set({ focusPanelRect }),
  finishFocusExit: () => set({ focus: { state: 'idle', displayId: null, productIndex: 0, returnPose: null } }),
  // Con zero capi il modulo darebbe NaN e l'indice resterebbe rotto (T17).
  cycleProduct: (delta, count) => {
    if (!count) return
    set((s) => ({ focus: { ...s.focus, productIndex: (s.focus.productIndex + delta + count) % count } }))
  },

  openDialog: (kind, id) => {
    const stack = get().dialogs
    // Già nella pila (Lookbook → capo → di nuovo il Lookbook): si torna lì invece
    // di accumulare livelli, così "Indietro" non gira in tondo.
    const at = stack.findIndex((d) => d.kind === kind && d.id === id)
    set({ dialogs: at >= 0 ? stack.slice(0, at + 1) : [...stack, { kind, id }] })
  },
  backDialog: () => set((s) => ({ dialogs: s.dialogs.slice(0, -1) })),
  closeDialogs: () => set({ dialogs: [] }),

  // Modalità testo: da onboarding o fallback. Il 3D non si monta.
  enterTextMode: () => set({ phase: APP_PHASE.TEXT, menuOpen: false }),
  // Ritorno al 3D, solo dalla modalità testo e solo con WebGL2 (lo controlla chi chiama).
  leaveTextMode: () => { if (get().phase === APP_PHASE.TEXT) set({ phase: APP_PHASE.ONBOARDING, dialogs: [] }) },

  enterStore: () => {
    if (get().phase === APP_PHASE.ONBOARDING) set({ phase: APP_PHASE.EXPLORING })
  },
}))
