import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { sampler } from '../../lib/perf.js'
import { usePerfStore } from '../../state/usePerfStore.js'

/**
 * Registra ogni fotogramma nel campionatore e pubblica, poche volte al secondo,
 * una fotografia per l'HUD. `gl.info.render` è azzerato all'inizio di ogni
 * render: letto qui, descrive il fotogramma precedente, che è quello misurato.
 */
export default function PerfProbe({ monitor }) {
  const { gl } = useThree()
  const lastPublish = useRef(0)

  useFrame(() => {
    const now = performance.now()
    sampler.frame(now, gl.info.render.calls, gl.info.render.triangles)
    if (now - lastPublish.current < 1000 / monitor.publishHz) return
    lastPublish.current = now
    usePerfStore.setState({
      stats: sampler.window(monitor.windowMs, now),
      memory: { geometries: gl.info.memory.geometries, textures: gl.info.memory.textures, programs: gl.info.programs?.length ?? 0 },
      dpr: gl.getPixelRatio(),
    })
  })
  return null
}
