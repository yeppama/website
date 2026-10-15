import { useMemo } from 'react'
import { makeGrainDataUrl } from '../../lib/noise.js'
import { storeConfig } from '../../config/storeConfig.js'

/**
 * D6-B — la grana del brand come velo in compositing, NON come passaggio di
 * post-processing dentro WebGL. Il motore 3D non la vede: il costo lo paga il
 * compositore del browser, che è un percorso diverso e scarico.
 *
 * La vignettatura è un gradiente CSS: costo nullo.
 */
export default function GrainOverlay({ tier, reducedMotion }) {
  const fx = storeConfig.performance.postFx
  const noise = useMemo(() => makeGrainDataUrl(fx.grain.tileSize), [fx.grain.tileSize])
  const opacity = fx.grain.opacity[tier] ?? fx.grain.opacity.medium
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
            background: `radial-gradient(ellipse at center, transparent 42%, rgba(0,0,0,${fx.vignette.strength}) 100%)`,
          }}
        />
      )}
    </div>
  )
}
