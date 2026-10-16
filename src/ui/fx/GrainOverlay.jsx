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
// Diagnosi delle prestazioni: con ?perf=1 o ?bench=1, `&fx=0` toglie grana e
// vignettatura, per misurare quanto costano al compositore sul dispositivo vero.
const params = new URLSearchParams(window.location.search)
const diagnostic = Boolean(params.get('perf') || params.get('bench') || params.get('debug'))
export const fxDisabled = diagnostic && params.get('fx') === '0'
// Confronto sul dispositivo vero: &grain=overlay | alpha forza il tipo di fusione.
const forcedBlend = diagnostic && ['overlay', 'alpha'].includes(params.get('grain')) ? params.get('grain') : null
export const grainBlend = forcedBlend ?? storeConfig.performance.postFx.grain.blend

export default function GrainOverlay({ tier, reducedMotion }) {
  const fx = storeConfig.performance.postFx
  const inFocus = useAppStore((s) => s.focus.state === 'entering' || s.focus.state === 'focused')
  const vignette = inFocus ? storeConfig.focus.vignetteStrength : fx.vignette.strength
  const overlay = grainBlend === 'overlay'
  const noise = useMemo(() => makeGrainDataUrl(fx.grain.tileSize, overlay ? 'overlay' : 'alpha'), [fx.grain.tileSize, overlay])
  const levels = overlay ? fx.grain.opacity : fx.grain.alphaOpacity
  const opacity = levels[tier] ?? levels.medium
  if (fxDisabled) return null
  const grainOn = opacity > 0   // tier low: niente grana, la vignettatura resta
  // Un granello = un pixel fisico. Senza questa correzione, a DPR 3 ogni granello
  // occupa 3×3 pixel e su telefono la grana appare tre volte più grossa.
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const tileCss = fx.grain.tileSize / dpr
  const stepMs = Math.round(1000 / fx.grain.animateHz) * 10 // 10 fotogrammi per ciclo

  return (
    <div className="pointer-events-none fixed inset-0" style={{ zIndex: 'var(--z-hud)' }} aria-hidden="true">
      {grainOn && <div
        className="absolute"
        data-testid="grain"
        style={{
          // Più grande del viewport: traslando, i bordi non si scoprono mai.
          inset: '-10%',
          backgroundImage: `url(${noise})`,
          backgroundRepeat: 'repeat',
          backgroundSize: `${tileCss}px ${tileCss}px`,
          imageRendering: 'pixelated',
          opacity,
          mixBlendMode: overlay ? 'overlay' : 'normal',
          animation: reducedMotion ? 'none' : `grain-shift ${stepMs}ms steps(1, end) infinite`,
          willChange: 'transform',
        }}
      />}
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
