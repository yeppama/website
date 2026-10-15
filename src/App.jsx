import { useEffect, useCallback, lazy, Suspense } from 'react'
import { storeConfig } from './config/storeConfig.js'
import { assertStoreConfig } from './config/validateStoreConfig.js'
import { getDeviceProfile } from './lib/deviceProfile.js'
import { useAppStore, APP_PHASE } from './state/useAppStore.js'

// three.js è il pezzo pesante del bundle: caricandolo a parte, l'onboarding
// appare subito e la barra di progresso misura passaggi reali.
const StoreCanvas = lazy(() => import('./scene/StoreCanvas.jsx'))

import OnboardingScreen from './ui/onboarding/OnboardingScreen.jsx'
import Hud from './ui/hud/Hud.jsx'
import NoticeToast from './ui/hud/NoticeToast.jsx'
import MenuDrawer from './ui/menu/MenuDrawer.jsx'
import GrainOverlay from './ui/fx/GrainOverlay.jsx'
import FadeOverlay from './ui/fx/FadeOverlay.jsx'
import WebGLFallback from './ui/fallback/WebGLFallback.jsx'

const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])
const stageOrder = storeConfig.loading.stages.map((s) => s.id)

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

  // Finché la navigazione non esiste, un tentativo di muoversi riceve una
  // risposta invece del silenzio: il silenzio sembra un guasto.
  useEffect(() => {
    if (!exploring || navigationOn) return
    const onKey = (e) => { if (MOVE_KEYS.has(e.code)) showNotice(storeConfig.copy.hints.navigationLocked) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [exploring, navigationOn, showNotice])

  if (!device) return null
  if (phase === APP_PHASE.UNSUPPORTED) return <WebGLFallback renderer={device.renderer} />

  const stage = storeConfig.loading.stages.find((s) => s.id === loadStage)
  const ready = loadStage === 'frame'

  return (
    <div className="relative h-full w-full">
      <div
        className="absolute inset-0"
        style={{ zIndex: 'var(--z-canvas)' }}
        onPointerDown={() => {
          if (exploring && !navigationOn) showNotice(storeConfig.copy.hints.navigationLocked)
        }}
      >
        <Suspense fallback={null}>
          <StoreCanvas config={storeConfig} device={device} onStage={onStage} />
        </Suspense>
      </div>

      <GrainOverlay tier={device.tier} reducedMotion={device.reducedMotion} />
      <FadeOverlay />

      {exploring ? (
        <>
          <Hud device={device} />
          <NoticeToast />
          <MenuDrawer />
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
