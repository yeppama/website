import { StrictMode, useCallback, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import Scene from './Scene.jsx'
import { cantiere as C } from './config.js'
import '../../styles/fonts.css'

/** Pagina di prova: la scena del cantiere, i bottoni delle viste e i numeri del disegno. */
function App() {
  const [view, setView] = useState(0)
  const [stats, setStats] = useState(null)
  const onReady = useCallback(() => { window.__cantiereReady = true }, [])
  window.__setView = setView
  const btn = (on) => ({
    font: '700 12px Archivo, sans-serif', letterSpacing: '0.12em', textTransform: 'uppercase',
    padding: '10px 14px', minHeight: 44, border: `1px solid ${on ? C.palette.orange : '#555'}`,
    color: on ? C.palette.orange : '#eee', background: 'rgba(14,14,14,0.8)', cursor: 'pointer',
  })
  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <Canvas shadows dpr={[1, 1.5]} camera={{ fov: 60, near: 0.05, far: 40 }}
              gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}>
        <Scene view={view} onStats={setStats} onReady={onReady} />
      </Canvas>
      <div style={{ position: 'absolute', left: 16, top: 16, color: '#eee', font: '400 12px "JetBrains Mono", monospace' }}>
        <div style={{ font: '900 20px Archivo, sans-serif', letterSpacing: '0.1em' }}>INTO · PROVA CANTIERE</div>
        <div style={{ opacity: 0.7, marginTop: 4 }}>Trascina per guardarti attorno · rotella per avvicinarti</div>
        {stats && <div style={{ opacity: 0.7, marginTop: 4 }} data-testid="stats">
          {stats.calls} draw call · {stats.triangles.toLocaleString('it-IT')} triangoli · {stats.textures} texture
        </div>}
      </div>
      <div style={{ position: 'absolute', left: 16, right: 16, bottom: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {C.views.map((v, i) => <button key={v.label} type="button" style={btn(i === view)} onClick={() => setView(i)}>{v.label}</button>)}
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
