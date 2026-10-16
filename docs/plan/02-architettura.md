# PLAN §2

> Parte di `PLAN.md` (indice). Numerazione delle sezioni invariata.

## 2. Architettura delle cartelle

```
/
├── PLAN.md                        # questo documento
├── README.md
├── index.html                     # entry Vite, <noscript> + contenitore fallback
├── package.json
├── vite.config.js
├── tailwind.config.js             # mappa i token di designTokens.js su classi utility
├── postcss.config.js
├── eslint.config.js
├── docs/
│   ├── PERF.md                    # log delle misurazioni (dalla Fase 6; schema in §5)
│   └── DECISIONS.md               # registro decisioni (ADR brevi)
├── public/
│   ├── models/                    # .glb segnaposto low-poly (Fase 4)
│   └── textures/                  # solo ciò che non è generabile proceduralmente
└── src/
    ├── main.jsx                   # bootstrap: probe WebGL → App | WebGLFallback
    ├── App.jsx                    # orchestratore: Onboarding / Canvas / UI overlay
    │
    ├── config/                    # ── IL "CMS LOCALE" — unica fonte di verità ──
    │   ├── storeConfig.js         # mappa, POI, espositori, prodotti, luci, collider, waypoint
    │   ├── designTokens.js        # palette, tipografia, spaziature, z-index, durate
    │   └── validateStoreConfig.js # validatore delle invarianti referenziali (solo DEV)
    │
    ├── state/
    │   ├── useAppStore.js         # store Zustand: appPhase, device, focus, modal, hud
    │   └── usePlayerStore.js      # posizione/rotazione player (scritto da useFrame, non reattivo)
    │
    ├── lib/                       # logica pura, zero React, testabile in isolamento
    │   ├── navGraph.js            # costruzione grafo + A* + proiezione punto→nodo
    │   ├── collision.js           # risolutore AABB a scivolamento (sweep & slide)
    │   ├── materials.js           # factory materiali PBR procedurali + texture a griglia (canvas)
    │   ├── cameraPath.js          # easing/interpolazione pose camera (Focus Mode)
    │   ├── deviceProfile.js       # rilevamento touch/puntatore + tier prestazionale
    │   └── perf.js                # campionamento fps, p1% low, contatori render
    │
    ├── hooks/
    │   ├── useDeviceProfile.js
    │   ├── useKeyboardMove.js     # WASD/frecce → vettore di input
    │   ├── usePointerLook.js      # Pointer Lock desktop + gestione perdita focus
    │   ├── useDragLook.js         # orientamento mobile via trascinamento (≠ tap)
    │   ├── useTapToMove.js        # raycast → waypoint/pavimento/espositore → percorso
    │   ├── useProximity.js        # distanza player ↔ POI → stato hotspot
    │   └── useFocusCamera.js      # ingresso/uscita Focus Mode
    │
    ├── scene/                     # ── tutto generato da storeConfig, zero letterali ──
    │   ├── StoreCanvas.jsx        # <Canvas>, dpr adattivo, tone mapping, color space
    │   ├── environment/
    │   │   ├── Floor.jsx  Ceiling.jsx  Walls.jsx  Zone.jsx  Entrance.jsx
    │   ├── lighting/
    │   │   ├── AmbientRig.jsx     # ambient + hemisphere + env map
    │   │   └── SpotRig.jsx        # faretti da config, budget ombre per tier
    │   ├── colliders/
    │   │   ├── ColliderSet.jsx    # AABB invisibili (nessuna geometria renderizzata)
    │   │   └── ColliderDebug.jsx  # wireframe, attivo solo con ?debug=1
    │   ├── displays/
    │   │   ├── Display.jsx        # dispatcher per `kind`
    │   │   ├── DisplayMannequin.jsx  DisplayPlinth.jsx  DisplayRack.jsx  DisplayWall.jsx
    │   │   └── Hotspot.jsx        # indicatore floating (POI, non legato al modello)
    │   ├── navigation/
    │   │   ├── WaypointMarkers.jsx   # visibili solo su mobile
    │   │   └── MoveTargetPing.jsx
    │   └── player/
    │       ├── PlayerController.jsx  # integra input → collisione → camera
    │       ├── DesktopControls.jsx  MobileControls.jsx
    │       └── FocusCameraRig.jsx
    │
    ├── ui/
    │   ├── onboarding/
    │   │   ├── LoaderScreen.jsx      # progresso reale da useProgress
    │   │   └── ControlsPrimer.jsx    # istruzioni divergenti desktop / mobile
    │   ├── hud/
    │   │   ├── Crosshair.jsx  Minimap.jsx  ProximityPrompt.jsx
    │   │   └── QuickTravelBar.jsx    # barra teletrasporto (solo mobile)
    │   ├── menu/ MenuDrawer.jsx
    │   ├── product/ ProductModal.jsx  SizeSelector.jsx       # Fase 5
    │   ├── lookbook/ LookbookPanel.jsx                        # Fase 5
    │   ├── primitives/
    │   │   ├── PlaceholderImage.jsx  # 1:1 / 16:9 / 4:5 + skeleton + etichetta stabile
    │   │   ├── Skeleton.jsx  Button.jsx  Panel.jsx  Tag.jsx
    │   └── fallback/ WebGLFallback.jsx
    │
    └── styles/
        └── index.css              # reset + @theme Tailwind + keyframes skeleton
```

**Regola architetturale non negoziabile:** nessun file sotto `src/scene/`, `src/ui/` o `src/hooks/`
contiene un numero di posizione, un nome di prodotto, un colore esadecimale, un testo o un percorso
asset. Tutto arriva da `src/config/`. Un componente di scena riceve un oggetto di config come prop e
ne interpreta i campi. Il controllo è automatizzabile con una regola ESLint `no-restricted-syntax`
sui letterali numerici nelle prop di posizione (da valutare in Fase 2).

---

