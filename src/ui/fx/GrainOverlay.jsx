import { useMemo } from 'react'
import { makeGrainDataUrl } from '../../lib/noise.js'
import { storeConfig } from '../../config/storeConfig.js'
import { useAppStore } from '../../state/useAppStore.js'

/**
 * D6-B — la grana del brand come velo in compositing, NON come passaggio di
 * post-processing dentro WebGL. Il motore 3D non la vede: il costo lo paga il
 * compositore del browser, che è un percorso diverso e scarico.
 *
 * La vignettatura è un gradiente CSS: costo nullo.
 */
export default function GrainOverlay({ tier, reducedMotion }) {
  const fx = storeConfig.performance.postFx
  const inFocus = useAppStore((s) => s.focus.state === 'entering' || s.focus.state === 'focused')
  const vignette = inFocus ? storeConfig.focus.vignetteStrength : fx.vignette.strength
  const noise = useMemo(() => makeGrainDataUrl(fx.grain.tileSize), [fx.grain.tileSize])
  const opacity = fx.grain.opacity[tier] ?? fx.grain.opacity.medium
  // Un granello = un pixel fisico. Senza questa correzione, a DPR 3 ogni granello
  // occupa 3×3 pixel e su telefono la grana appare tre volte più grossa.
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const tileCss = fx.grain.tileSize / dpr
  const stepMs = Math.round(1000 / fx.grain.animateHz) * 10 // 10 fotogrammi per ciclo

  return (
    <div className="pointer-events-none fixed inset-0" style={{ zIndex: 'var(--z-hud)' }} aria-hidden="true">
      <div
        className="absolute"
        style={{
          // Più grande del viewport: traslando, i bordi non si scoprono mai.
          inset: '-10%',
          backgroundImage: `url(${noise})`,
          backgroundRepeat: 'repeat',
          backgroundSize: `${tileCss}px ${tileCss}px`,
          imageRendering: 'pixelated',
          opacity,
          mixBlendMode: 'overlay',
          animation: reducedMotion ? 'none' : `grain-shift ${stepMs}ms steps(1, end) infinite`,
          willChange: 'transform',
        }}
      />
      {fx.vignette.enabled && (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at center, transparent 42%, rgba(0,0,0,1) 100%)`,
            opacity: vignette,
            transition: 'opacity 700ms ease',
          }}
        />
      )}
    </div>
  )
}
