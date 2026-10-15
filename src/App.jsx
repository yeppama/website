import { useEffect, useState, lazy, Suspense } from 'react'
import { storeConfig } from './config/storeConfig.js'
import { assertStoreConfig } from './config/validateStoreConfig.js'
import { getDeviceProfile, zoneAt } from './lib/deviceProfile.js'
import { useAppStore, APP_PHASE } from './state/useAppStore.js'

// three.js è il pezzo pesante del bundle: caricandolo a parte, l'onboarding
// appare subito e la barra di progresso misura qualcosa di reale.
const StoreCanvas = lazy(() => import('./scene/StoreCanvas.jsx'))
import OnboardingScreen from './ui/onboarding/OnboardingScreen.jsx'
import Hud from './ui/hud/Hud.jsx'
import MenuDrawer from './ui/menu/MenuDrawer.jsx'
import GrainOverlay from './ui/fx/GrainOverlay.jsx'
import WebGLFallback from './ui/fallback/WebGLFallback.jsx'

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
  const setActiveZone = useAppStore((s) => s.setActiveZone)

  const [sceneReady, setSceneReady] = useState(false)

  useEffect(() => {
    // Le invarianti del config sono controllate una volta all'avvio, in sviluppo.
    assertStoreConfig(storeConfig)
    const profile = getDeviceProfile()
    setDevice(profile)
    setPhase(profile.webgl2 ? APP_PHASE.ONBOARDING : APP_PHASE.UNSUPPORTED)

    // Fase 1b: la zona attiva deriva dalla posa fissa della camera. In Fase 3
    // deriverà dalla posizione del player, senza toccare HUD né minimappa.
    const [cx, , cz] = storeConfig.camera.staticPose.position
    setActiveZone(zoneAt([cx, cz], storeConfig.environment.zones)?.id ?? null)
  }, [setDevice, setPhase, setActiveZone])

  if (!device) return null
  if (phase === APP_PHASE.UNSUPPORTED) return <WebGLFallback renderer={device.renderer} />

  const exploring = phase === APP_PHASE.EXPLORING

  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0" style={{ zIndex: 'var(--z-canvas)' }}>
        <Suspense fallback={null}>
          <StoreCanvas config={storeConfig} device={device} onReady={() => setSceneReady(true)} />
        </Suspense>
      </div>

      <GrainOverlay tier={device.tier} reducedMotion={device.reducedMotion} />

      {exploring ? (
        <>
          <Hud device={device} />
          <MenuDrawer />
        </>
      ) : (
        <OnboardingScreen
          device={device}
          ready={sceneReady}
          progress={sceneReady ? 1 : 0.35}
          onEnter={enterStore}
        />
      )}
    </div>
  )
}
