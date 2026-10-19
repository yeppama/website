import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js'

/** Layer degli oggetti che emettono il bagliore (neon, bordi dei pannelli luminosi). */
export const BLOOM_LAYER = 1

/**
 * Bloom vero, selettivo, solo dove l'allestimento lo chiede e solo sul tier che lo regge
 * (cantiere: GPU dedicata, docs/cantiere/PIANO.md, scelta 2). Gli altri vedono l'alone finto.
 *
 * L'immagine della scena resta quella di sempre: stesso render a schermo, stesso tone mapping e
 * antialias. Il bagliore si calcola a parte, a risoluzione ridotta, e si somma sopra:
 *   1. maschera: tutta la scena in nero (solo profondità, gli oggetti davanti al neon lo coprono),
 *      poi soltanto gli oggetti sul layer BLOOM_LAYER con i loro materiali;
 *   2. sfocatura a più livelli di UnrealBloomPass sulla maschera;
 *   3. il risultato sommato (fusione additiva) sopra l'immagine già a schermo.
 * Con priorità 1 questo ciclo prende il posto del render automatico di React Three Fiber.
 * `gl.info` si azzera a mano a inizio fotogramma: il conteggio dell'HUD comprende i passaggi del
 * bloom, che sono un costo vero.
 */
export default function SelectiveBloom({ bloom }) {
  const { gl, scene, camera } = useThree()

  const parts = useMemo(() => {
    const mask = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType })
    const pass = new UnrealBloomPass(new THREE.Vector2(1, 1), bloom.strength, bloom.radius, bloom.threshold)
    const black = new THREE.MeshBasicMaterial({ color: 0x000000 })
    const add = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: { tBloom: { value: null } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: 'uniform sampler2D tBloom; varying vec2 vUv; void main() { gl_FragColor = vec4(texture2D(tBloom, vUv).rgb, 1.0); }',
      blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true,
    }))
    return { mask, pass, black, add, size: new THREE.Vector2(), hidden: [] }
  }, [bloom.strength, bloom.radius, bloom.threshold])

  useEffect(() => () => {
    parts.mask.dispose(); parts.pass.dispose(); parts.black.dispose()
    parts.add.material.dispose(); parts.add.dispose()
  }, [parts])

  useEffect(() => {
    const autoReset = gl.info.autoReset
    gl.info.autoReset = false
    return () => { gl.info.autoReset = autoReset }
  }, [gl])

  useFrame(() => {
    const { mask, pass, black, add, size, hidden } = parts
    gl.info.reset()
    gl.setRenderTarget(null)
    gl.render(scene, camera)

    gl.getDrawingBufferSize(size)
    const w = Math.max(1, Math.round(size.x * bloom.resolutionScale))
    const h = Math.max(1, Math.round(size.y * bloom.resolutionScale))
    if (mask.width !== w || mask.height !== h) { mask.setSize(w, h); pass.setSize(w, h) }

    // Maschera. I piani trasparenti che non scrivono profondità (aloni, hotspot, adesivi) in
    // nero pieno diventerebbero rettangoli scuri dentro il bagliore: si nascondono.
    const background = scene.background
    const shadowUpdate = gl.shadowMap.autoUpdate
    const layers = camera.layers.mask
    scene.background = null
    gl.shadowMap.autoUpdate = false
    hidden.length = 0
    scene.traverse((o) => {
      const m = o.material
      if (o.visible && m && !Array.isArray(m) && m.transparent && !m.depthWrite && !o.layers.isEnabled(BLOOM_LAYER)) {
        o.visible = false; hidden.push(o)
      }
    })
    gl.setRenderTarget(mask)
    gl.setClearColor(0x000000, 1)
    gl.clear()
    scene.overrideMaterial = black
    gl.render(scene, camera)
    scene.overrideMaterial = null
    camera.layers.set(BLOOM_LAYER)
    gl.autoClear = false
    gl.render(scene, camera)
    gl.autoClear = true
    camera.layers.mask = layers
    for (const o of hidden) o.visible = true
    scene.background = background
    gl.shadowMap.autoUpdate = shadowUpdate

    // Sfocatura (la pass scrive il composito in renderTargetsHorizontal[0]) e somma a schermo.
    pass.render(gl, null, mask, 0, false)
    add.material.uniforms.tBloom.value = pass.renderTargetsHorizontal[0].texture
    gl.setRenderTarget(null)
    gl.autoClear = false
    add.render(gl)
    gl.autoClear = true
  }, 1)

  return null
}
