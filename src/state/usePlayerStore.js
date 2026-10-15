import { create } from 'zustand'

/**
 * Stato del player condiviso con l'interfaccia.
 *
 * La simulazione vive nel controller, dentro il render loop, e NON passa da qui
 * a ogni frame: qui arriva una fotografia a ~10 Hz (posa, zona) più gli eventi
 * discreti (prossimità, percorso, ping). Così minimappa e HUD si aggiornano
 * senza costringere React a ridisegnarli 60 volte al secondo.
 *
 * L'interfaccia comanda il player accodando comandi (`issue`), che il controller
 * consuma nel frame successivo: nessun componente UI tocca la simulazione.
 */
export const usePlayerStore = create((set, get) => ({
  pose: { x: 0, z: 0, yaw: 0 },
  zoneId: null,
  pointerLocked: false,
  poiStates: {},        // { [poiId]: 'hidden' | 'visible' | 'active' }
  activePoiId: null,
  route: null,          // { id, points: [[x, z], ...] } percorso automatico in corso
  ping: null,           // { id, x, z, ok } conferma visiva di un tap
  fading: false,
  // Posa da riprendere quando la scena viene rimontata (perdita del contesto WebGL).
  resumePose: null,
  commands: [],

  issue: (command) => set((s) => ({ commands: [...s.commands, command] })),
  drain: () => {
    const commands = get().commands
    if (commands.length) set({ commands: [] })
    return commands
  },
}))
