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
}

export const useAppStore = create((set, get) => ({
  phase: APP_PHASE.BOOT,
  device: null,          // popolato da useDeviceProfile
  menuOpen: false,
  activeZoneId: null,
  activeShotId: null,    // inquadratura statica corrente (Fase 2)
  reducedMotion: false,
  loadStage: 'boot',
  notice: null,          // messaggio breve mostrato sopra la scena

  setPhase: (phase) => set({ phase }),
  setDevice: (device) => set({ device }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setActiveZone: (activeZoneId) => set({ activeZoneId }),
  // Un'inquadratura porta con sé la sua zona: HUD e minimappa restano coerenti.
  setShot: (shot) => set({ activeShotId: shot.id, activeZoneId: shot.zoneId }),
  setLoadStage: (loadStage) => set({ loadStage }),

  // Un solo messaggio alla volta, che si nasconde da solo. `id` evita che un
  // timer vecchio cancelli un messaggio più recente.
  showNotice: (text, ms = 2600) => {
    const id = Date.now()
    set({ notice: { id, text } })
    setTimeout(() => { if (get().notice?.id === id) set({ notice: null }) }, ms)
  },

  toggleMenu: () => set({ menuOpen: !get().menuOpen }),
  closeMenu: () => set({ menuOpen: false }),

  enterStore: () => {
    if (get().phase === APP_PHASE.ONBOARDING) set({ phase: APP_PHASE.EXPLORING })
  },
}))
