import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { getMaterial } from '../../lib/materials.js'
import { useMat, useFabric, garmentPhoto, usePhotoMaterial } from './parts.jsx'
import { getPhotoPatchGeometry } from '../../lib/garmentPhotos.js'

/**
 * Tavolo di blocchi di cemento (allestimento del cantiere): due pilastri di blocchi in istanza,
 * piano d'acciaio, pile di capi piegati. Ogni capo è una pila nel colore della sua prima
 * variante, con la foto in cima; `extraStacks` sono pile di contorno senza capo.
 * Un capo 3D sdraiato sembrerebbe gonfio (il modello nasce indossato): qui niente GLB.
 */
const BLOCK = [0.39, 0.19, 0.19]
const LEVELS = 3
const TOP = BLOCK[1] * LEVELS
const PLATE = [1.6, 0.04, 0.7]
const LAYER = 0.05
const slotX = (count, i) => (count === 1 ? 0.05 : -0.2 + (0.5 * i) / (count - 1))

/** Dove sta il marcatore del prodotto attivo, nello spazio dell'espositore. */
export const blockTableMarker = (count, i) => [slotX(count, i), TOP + PLATE[1] + 0.25, 0]

function Stack({ x, layers, material, children }) {
  return (
    <group position={[x, TOP + PLATE[1], 0]}>
      {Array.from({ length: layers }, (_, k) => (
        <mesh key={k} position={[(k % 2) * 0.01, LAYER / 2 + k * LAYER, 0]} rotation={[0, (k - 1) * 0.04, 0]} material={material} castShadow receiveShadow>
          <boxGeometry args={[0.36, LAYER - 0.005, 0.3]} />
        </mesh>
      ))}
      {children}
    </group>
  )
}

function ProductStack({ product, garments, materials, x, layers = 3 }) {
  const fabric = useFabric(product, garments, materials)
  const photo = garmentPhoto(product)
  const photoMaterial = usePhotoMaterial(photo, garments, false)
  const crop = garments.photo.stackCrop[garments.shapeByCategory[product.category]]
  return (
    <Stack x={x} layers={layers} material={fabric}>
      {photo && (
        <mesh position={[((layers - 1) % 2) * 0.01, layers * LAYER - 0.002, 0]} rotation={[0, (layers - 2) * 0.04, 0]}
          geometry={getPhotoPatchGeometry(photo, crop, 0.35, 0.29)} material={photoMaterial} receiveShadow />
      )}
    </Stack>
  )
}

function ExtraStack({ x, color, layers, garments, materials }) {
  const material = useMemo(
    () => getMaterial(`${garments.materialId}:${color}`, { ...materials[garments.materialId], color }),
    [color, garments.materialId, materials],
  )
  return <Stack x={x} layers={layers} material={material} />
}

export default function DisplayBlockTable({ display, products, garments, materials }) {
  const body = useMat(display.materialIds.body, materials)
  const plate = useMat('mat-steel-dark', materials)
  const ref = useRef()
  const blocks = useMemo(() => {
    const list = []
    for (const sx of [-0.55, 0.55]) for (let lvl = 0; lvl < LEVELS; lvl++) {
      for (const dz of [-0.2, 0.2]) list.push([sx, BLOCK[1] / 2 + lvl * BLOCK[1], dz, lvl % 2 ? 0.03 : -0.02])
    }
    return list
  }, [])
  const geometry = useMemo(() => new THREE.BoxGeometry(...BLOCK), [])
  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const up = new THREE.Vector3(0, 1, 0)
    const one = new THREE.Vector3(1, 1, 1)
    blocks.forEach(([x, y, z, rot], i) => ref.current.setMatrixAt(i, m.compose(new THREE.Vector3(x, y, z), q.setFromAxisAngle(up, rot), one)))
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [blocks])
  useLayoutEffect(() => () => geometry.dispose(), [geometry])
  return (
    <group>
      <instancedMesh ref={ref} args={[geometry, body, blocks.length]} castShadow receiveShadow />
      <mesh position={[0, TOP + PLATE[1] / 2, 0]} material={plate} castShadow receiveShadow>
        <boxGeometry args={PLATE} />
      </mesh>
      {products.map((p, i) => (
        <ProductStack key={p.id} product={p} garments={garments} materials={materials} x={slotX(products.length, i)} />
      ))}
      {(display.extraStacks ?? []).map((s) => (
        <ExtraStack key={s.x} {...s} garments={garments} materials={materials} />
      ))}
    </group>
  )
}
