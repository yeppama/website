import { storeConfig } from '../../config/storeConfig.js'
import { usePerfStore } from '../../state/usePerfStore.js'

const f1 = (n) => (Number.isFinite(n) ? n.toFixed(1) : '—')
const f0 = (n) => (Number.isFinite(n) ? Math.round(n).toLocaleString(storeConfig.meta.brand.locale) : '—')

/**
 * HUD prestazioni (?perf=1, e sempre durante il benchmark). Esiste anche in
 * produzione: le misure vere si fanno sui dispositivi veri, cioè sull'URL
 * pubblicato. Non intercetta input: è testo sopra la scena.
 */
export default function PerfHud({ device }) {
  const stats = usePerfStore((s) => s.stats)
  const memory = usePerfStore((s) => s.memory)
  const dpr = usePerfStore((s) => s.dpr)
  const t = storeConfig.copy.perf
  const software = /swiftshader|llvmpipe|software/i.test(device.renderer ?? '')
  const rows = [
    [t.fps, f1(stats?.fpsP50)],
    [t.low, f1(stats?.fps1Low)],
    [t.frame, f1(stats?.frameMsP95)],
    [t.calls, `${f0(stats?.callsAvg)} / ${f0(stats?.callsMax)}`],
    [t.tris, f0(stats?.trisMax)],
    [t.memory, memory ? `${memory.geometries} / ${memory.textures} / ${memory.programs}` : '—'],
  ]

  return (
    <div
      className="pointer-events-none fixed left-4 top-16 w-[min(17rem,calc(100vw-2rem))] border border-line-strong bg-bg-base/80 px-3 py-2 backdrop-blur-sm sm:left-6"
      style={{ zIndex: 'var(--z-hud)' }}
      data-testid="perf-hud"
      aria-hidden="true"
    >
      <p className="micro" style={{ color: 'var(--color-accent-flame)' }}>
        {t.title} · tier {device.tier} · dpr {f1(dpr)} · cap {storeConfig.performance.targetFps}
      </p>
      <dl className="mt-1 grid grid-cols-[auto_auto] gap-x-4">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="micro">{k}</dt>
            <dd className="micro text-right text-text-primary" data-perf={k}>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="micro mt-1 truncate">{device.renderer}</p>
      {software && <p className="micro mt-1" style={{ color: 'var(--color-state-danger)' }}>{t.softwareWarning}</p>}
    </div>
  )
}
