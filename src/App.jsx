import { useEffect, useCallback, useRef, useState, lazy, Suspense } from 'react'
import { storeConfig } from './config/storeConfig.js'
import { assertStoreConfig } from './config/validateStoreConfig.js'
import { getDeviceProfile } from './lib/deviceProfile.js'
import { useAppStore, APP_PHASE } from './state/useAppStore.js'
import { usePlayerStore } from './state/usePlayerStore.js'
import { useCartStore } from './state/useCartStore.js'
import { installBackButton } from './state/backButton.js'

// three.js è il pezzo pesante del bundle: caricandolo a parte, l'onboarding
// appare subito e la barra di progresso misura passaggi reali.
const StoreCanvas = lazy(() => import('./scene/StoreCanvas.jsx'))

import OnboardingScreen from './ui/onboarding/OnboardingScreen.jsx'
import Hud from './ui/hud/Hud.jsx'
import NoticeToast from './ui/hud/NoticeToast.jsx'
import MenuDrawer from './ui/menu/MenuDrawer.jsx'
import FocusPanel from './ui/focus/FocusPanel.jsx'
import DialogHost from './ui/dialog/DialogHost.jsx'
import GrainOverlay from './ui/fx/GrainOverlay.jsx'
import FadeOverlay from './ui/fx/FadeOverlay.jsx'
import WebGLFallback from './ui/fallback/WebGLFallback.jsx'
import ContextLostOverlay from './ui/fallback/ContextLostOverlay.jsx'
import ErrorBoundary from './ui/fallback/ErrorBoundary.jsx'
import PerfHud from './ui/perf/PerfHud.jsx'
import BenchPanel from './ui/bench/BenchPanel.jsx'

const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])
const stageOrder = storeConfig.loading.stages.map((s) => s.id)
const params = new URLSearchParams(window.location.search)
const showPerf = Boolean(params.get('perf') || params.get('bench'))
const runBench = Boolean(params.get('bench'))

/**
 * Orchestratore. Decide fra schermata di fallback, onboarding e esperienza,
 * e non contiene nessun contenuto: ogni testo, colore e coordinata vive in config.
 */
export default function App() {
  const phase = useAppStore((s) => s.phase)
  const setPhase = useAppStore((s) => s.setPhase)
  const device = useAppStore((s) => s.device)
  const setDevice = useAppStore((s) => s.setDevice)
  const enterStore = useAppStore((s) => s.enterStore)
  const setShot = useAppStore((s) => s.setShot)
  const loadStage = useAppStore((s) => s.loadStage)
  const setLoadStage = useAppStore((s) => s.setLoadStage)
  const showNotice = useAppStore((s) => s.showNotice)
  const gpuLost = useAppStore((s) => s.gpuLost)
  // Cambiare la chiave rimonta il Canvas: contesto WebGL nuovo, scena ricostruita.
  const [sceneKey, setSceneKey] = useState(0)
  // Canvas già sostituiti: smontandoli, React Three Fiber ne forza la perdita del
  // contesto, e quell'evento arriva dopo il rimontaggio. Non è un guasto nuovo.
  const retired = useRef(new WeakSet())

  const remountScene = useCallback((canvas) => {
    if (canvas instanceof HTMLCanvasElement) {
      if (retired.current.has(canvas)) return
      retired.current.add(canvas)
    } else {
      document.querySelectorAll('canvas').forEach((c) => retired.current.add(c))
    }
    // Il player riparte dalla posa in cui era; un Focus in corso si chiude,
    // perché la sua camera apparteneva alla scena che non c'è più.
    usePlayerStore.setState({
      resumePose: usePlayerStore.getState().pose,
      route: null,
      ping: null,
      fading: false,
      commands: [],
    })
    if (useAppStore.getState().focus.state !== 'idle') useAppStore.getState().finishFocusExit()
    useAppStore.setState({ gpuLost: false })
    setSceneKey((k) => k + 1)
  }, [])
  const onContextLost = useCallback((canvas) => {
    if (!retired.current.has(canvas)) useAppStore.setState({ gpuLost: true })
  }, [])

  useEffect(() => {
    if (params.get('debug')) window.__remountScene = remountScene
  }, [remountScene])

  // Catalogo commerciale e carrello salvato (Fase 8): solo se un fornitore è attivo.
  useEffect(() => {
    useCartStore.getState().init()
    if (params.get('debug')) window.__cart = useCartStore
  }, [])

  useEffect(() => {
    // Le invarianti del config sono controllate una volta all'avvio, in sviluppo.
    assertStoreConfig(storeConfig)
    const profile = getDeviceProfile()
    setDevice(profile)
    setPhase(profile.webgl2 ? APP_PHASE.ONBOARDING : APP_PHASE.UNSUPPORTED)

    // Inquadratura iniziale. L'inquadratura porta con sé la sua zona, quindi HUD e
    // minimappa sono coerenti da subito. In Fase 3 la zona deriverà dal player.
    const { shots, defaultShotId } = storeConfig.camera
    setShot(shots.find((x) => x.id === defaultShotId))
  }, [setDevice, setPhase, setShot])

  // Gli stadi avanzano solo in avanti: StrictMode e i rimontaggi non possono
  // far tornare indietro la barra.
  const onStage = useCallback((stage) => {
    const current = useAppStore.getState().loadStage
    if (stageOrder.indexOf(stage) > stageOrder.indexOf(current)) setLoadStage(stage)
  }, [setLoadStage])

  const exploring = phase === APP_PHASE.EXPLORING
  const navigationOn = storeConfig.features.navigation.enabled

  // Indietro del browser: chiude scheda, menu o Focus invece di lasciare il sito.
  useEffect(() => (exploring ? installBackButton() : undefined), [exploring])

  // Finché la navigazione non esiste, un tentativo di muoversi riceve una
  // risposta invece del silenzio: il silenzio sembra un guasto.
  useEffect(() => {
    if (!exploring || navigationOn) return
    const onKey = (e) => { if (MOVE_KEYS.has(e.code)) showNotice(storeConfig.copy.hints.notAvailable) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [exploring, navigationOn, showNotice])

  if (!device) return null
  if (phase === APP_PHASE.UNSUPPORTED) return <WebGLFallback renderer={device.renderer} />

  const stage = storeConfig.loading.stages.find((s) => s.id === loadStage)
  const ready = loadStage === 'frame'

  return (
    <div className="relative h-full w-full">
      {/* Il boundary sta FUORI dal contenitore del canvas: quel div ha uno
          z-index, quindi crea un contesto di impilamento, e l'avviso di guasto
          renderizzato al suo interno finirebbe sotto l'onboarding e l'HUD —
          visibile nel DOM e invisibile a chi guarda. */}
      <ErrorBoundary id="scene" onRetry={remountScene}>
        <div
          className="absolute inset-0"
          style={{ zIndex: 'var(--z-canvas)' }}
          onPointerDown={() => {
            if (exploring && !navigationOn) showNotice(storeConfig.copy.hints.notAvailable)
          }}
        >
          <Suspense fallback={null}>
            <StoreCanvas key={sceneKey} config={storeConfig} device={device} onStage={onStage}
                         onContextLost={onContextLost} onContextRestored={remountScene} />
          </Suspense>
        </div>
      </ErrorBoundary>

      <GrainOverlay tier={device.tier} reducedMotion={device.reducedMotion} />
      {showPerf && exploring && <PerfHud device={device} />}
      {gpuLost && <ContextLostOverlay onRetry={remountScene} />}
      <FadeOverlay />

      {exploring ? (
        <>
          <Hud device={device} />
          <NoticeToast />
          <FocusPanel device={device} />
          <MenuDrawer />
          <DialogHost device={device} />
          {runBench && <BenchPanel device={device} ready={ready} />}
        </>
      ) : (
        <OnboardingScreen
          device={device}
          ready={ready}
          progress={stage?.progress ?? 0}
          stageLabel={stage?.label}
          onEnter={enterStore}
        />
      )}
    </div>
  )
}
