import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { storeConfig } from '../../config/storeConfig.js'
import { runBenchmark, aggregateRuns, perfRow, browserLabel, segmentSummary, stutterSummary } from '../../lib/bench.js'
import { useAppStore } from '../../state/useAppStore.js'
import { usePlayerStore } from '../../state/usePlayerStore.js'
import { usePerfStore } from '../../state/usePerfStore.js'
import Button from '../primitives/Button.jsx'
import { fxDisabled, grainBlend } from '../fx/GrainOverlay.jsx'

/* global __BUILD_COMMIT__ */
const f1 = (n) => (Number.isFinite(n) ? n.toFixed(1) : '—')

/**
 * Benchmark (?bench=1). Parte da solo dopo l'ingresso, guida il player lungo il
 * percorso di storeConfig.benchmark e mostra i risultati del run, con la riga
 * già pronta per docs/PERF.md. "Ripeti" accumula i run: il protocollo ne vuole 3.
 * Mentre gira, un velo trasparente blocca tocchi e click sulla scena.
 */
export default function BenchPanel({ device, ready }) {
  const t = storeConfig.copy.bench
  const bench = storeConfig.benchmark
  const [status, setStatus] = useState('waiting')   // waiting | running | done | aborted | failed
  const [progress, setProgress] = useState(null)
  const [runs, setRuns] = useState([])
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(null)
  const controller = useRef(null)
  const started = useRef(false)
  const waypoints = useMemo(() => new Map(storeConfig.navigation.waypoints.map((w) => [w.id, w])), [])

  const start = useCallback(async () => {
    const app = useAppStore.getState()
    app.closeMenu()
    app.closeDialogs()
    if (app.focus.state !== 'idle') app.exitFocus()
    controller.current = new AbortController()
    setStatus('running')
    setError(null)
    setCopied(null)
    useAppStore.setState({ benchRunning: true })
    try {
      const result = await runBenchmark({
        benchmark: bench,
        waypoints,
        signal: controller.current.signal,
        onProgress: setProgress,
        api: {
          issue: (cmd) => usePlayerStore.getState().issue(cmd),
          exitFocus: () => useAppStore.getState().exitFocus(),
          focusState: () => useAppStore.getState().focus.state,
          hasRoute: () => Boolean(usePlayerStore.getState().route),
          pose: () => usePlayerStore.getState().pose,
        },
      })
      setRuns((r) => [...r, result])
      setStatus('done')
      if (window.location.search.includes('debug=')) window.__benchResult = result
    } catch (e) {
      setStatus(e.name === 'AbortError' ? 'aborted' : 'failed')
      setError(e.name === 'AbortError' ? null : e.message)
      if (useAppStore.getState().focus.state !== 'idle') useAppStore.getState().exitFocus()
    } finally {
      useAppStore.setState({ benchRunning: false })
      setProgress(null)
    }
  }, [bench, waypoints])

  // Primo run automatico, appena la scena è pronta.
  useEffect(() => {
    if (!ready || started.current) return
    started.current = true
    start()
  }, [ready, start])

  useEffect(() => () => controller.current?.abort(), [])

  const running = status === 'running'
  const agg = runs.length ? aggregateRuns(runs) : null
  const software = /swiftshader|llvmpipe|software/i.test(device.renderer ?? '')
  const row = agg && perfRow(agg, {
    date: new Date().toISOString().slice(0, 10),
    device: `(${t.fill})`,
    gpu: device.renderer ?? '—',
    browser: browserLabel(),
    commit: __BUILD_COMMIT__,
    tier: fxDisabled ? `${device.tier} ${t.fxOff}` : `${device.tier} · ${t.grain} ${grainBlend}`,
    dpr: usePerfStore.getState().dpr,
    viewport: `${window.innerWidth}×${window.innerHeight}`,
    real: software ? t.realNo : `(${t.realYes})`,
  })
  // La riga per il registro e, sotto, dove il percorso rallenta: si copiano insieme.
  const st = stutterSummary(runs)
  const report = row && `${row}\n${t.segments}: ${segmentSummary(runs)}\n${t.stutter}: max ${Math.round(st.frameMsMax)} ms · ${st.over50} > 50 ms · ${st.stalls} > 250 ms`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(report)
      setCopied(t.copied)
    } catch {
      setCopied(t.copyManual)
    }
  }

  if (running) {
    const step = progress?.step
    return (
      <>
        {/* Velo: nessun tocco o click arriva alla scena durante la misura. */}
        <div className="fixed inset-0" style={{ zIndex: 'var(--z-dialog)' }} data-testid="bench-veil" />
        <div className="fixed inset-x-0 top-4 flex justify-center px-4" style={{ zIndex: 'var(--z-dialog)' }}>
          <div className="flex items-center gap-4 border border-line-strong bg-bg-base/85 px-4 py-2 backdrop-blur-sm" role="status" aria-live="polite">
            <p className="micro text-text-primary" data-testid="bench-status">
              {t.title} · {progress?.index >= 0
                ? `${t.step} ${progress.index + 1}/${bench.steps.length} · ${step?.label ?? step?.type}`
                : t.warmup}
            </p>
            <Button onClick={() => controller.current?.abort()}>{t.abort}</Button>
          </div>
        </div>
      </>
    )
  }

  if (status === 'waiting') return null

  return (
    <div className="fixed inset-x-0 bottom-0 flex justify-center p-4 sm:p-6" style={{ zIndex: 'var(--z-dialog)' }}>
      <section aria-label={t.title} data-testid="bench-results"
               className="max-h-[80vh] w-full max-w-2xl overflow-y-auto border border-line-strong bg-bg-raised p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <p className="micro" style={{ color: 'var(--color-accent-flame)' }}>
            {t.title} · {status === 'done' ? t.done : status === 'aborted' ? t.aborted : t.failed}
          </p>
          <p className="micro">{device.tier} · {__BUILD_COMMIT__}</p>
        </div>
        {error && <p className="micro mt-2" style={{ color: 'var(--color-state-danger)' }}>{error}</p>}

        {runs.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  {[t.run, storeConfig.copy.perf.fps, storeConfig.copy.perf.frame, storeConfig.copy.perf.low, storeConfig.copy.perf.calls, t.seconds].map((h) => (
                    <th key={h} className="micro pb-2 pr-3 font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.map((r, i) => (
                  <tr key={i} className="border-t border-line-subtle" data-testid="bench-run">
                    {[i + 1, f1(r.fpsP50), f1(r.frameMsP95), f1(r.fps1Low), `${Math.round(r.callsAvg)}/${r.callsMax}`, f1(r.durationMs / 1000)].map((v, j) => (
                      <td key={j} className="micro py-1 pr-3 text-text-primary">{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="micro mt-3 text-text-primary">
              {t.median}: {f1(agg.fpsP50Median)} · {t.worst}: {f1(agg.fps1LowWorst)}
            </p>
            <p className="micro mt-1">{t.runsHint}</p>
            <textarea readOnly value={report} rows={6} data-testid="bench-row"
                      onFocus={(e) => e.target.select()}
                      className="micro mt-3 w-full resize-none border border-line-subtle bg-bg-base p-2 text-text-primary" />
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="primary" onClick={start}>{t.repeat}</Button>
          {row && <Button onClick={copy}>{t.copy}</Button>}
          {copied && <p className="micro">{copied}</p>}
          <Button className="ml-auto" onClick={() => setStatus('waiting')}>{t.close}</Button>
        </div>
      </section>
    </div>
  )
}
