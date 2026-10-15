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
  loadProgress: 0,
  menuOpen: false,
  activeZoneId: null,
  reducedMotion: false,

  setPhase: (phase) => set({ phase }),
  setDevice: (device) => set({ device }),
  setLoadProgress: (loadProgress) => set({ loadProgress }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setActiveZone: (activeZoneId) => set({ activeZoneId }),

  toggleMenu: () => set({ menuOpen: !get().menuOpen }),
  closeMenu: () => set({ menuOpen: false }),

  enterStore: () => {
    if (get().phase === APP_PHASE.ONBOARDING) set({ phase: APP_PHASE.EXPLORING })
  },
}))
