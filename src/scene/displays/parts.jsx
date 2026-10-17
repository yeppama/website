import { useMemo } from 'react'
import { getMaterial } from '../../lib/materials.js'
import { getGarmentGeometry } from '../../lib/garments.js'
import { getPhotoMaterial, getPhotoCardGeometry } from '../../lib/garmentPhotos.js'

/** Foto del capo per il 3D (contenuto `model3d`), nel colore esposto: il primo. Null se non c'è. */
export function garmentPhoto(product) {
  const m = product.model3d
  const photo = m?.byColorway?.[product.colorways[0].id] ?? m
  // Senza texture preparata (npm run media:build) resta la silhouette.
  return photo?.texture ? photo : null
}

/** Materiale con la foto del capo: scontornato (capo appeso) o pieno (busto, pile). */
export function usePhotoMaterial(photo, garments, cutout) {
  return useMemo(
    () => (photo ? getPhotoMaterial(photo.texture, { cutout, roughness: garments.photo.roughness }, garments.photo.alphaTest) : null),
    [photo, garments, cutout],
  )
}

/** Materiale del tessuto con il colore della prima variante del prodotto. */
export function useFabric(product, garments, materials) {
  const swatch = product.colorways[0].swatch
  return useMemo(
    () => getMaterial(`${garments.materialId}:${swatch}`, { ...materials[garments.materialId], color: swatch }),
    [swatch, garments.materialId, materials],
  )
}

export function useMat(id, materials) {
  return useMemo(() => getMaterial(id, materials[id]), [id, materials])
}

/** Cordino Flame Orange: il dettaglio della reference, due fili che pendono. */
export function Cord({ position, length = 0.24, spread = 0.05, color }) {
  // Materiale condiviso: tutti i cordini si uniscono in un'unica draw call.
  const material = useMemo(
    () => getMaterial(`cord:${color}`, { color, roughness: 0.6, metalness: 0, emissive: color, emissiveIntensity: 0.15 }),
    [color],
  )
  return (
    <group position={position}>
      {[-spread, spread].map((x) => (
        <mesh key={x} position={[x, -length / 2, 0]} material={material} castShadow>
          <cylinderGeometry args={[0.006, 0.006, length, 5]} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Capo appeso piatto (rack, parete), rivolto verso +z locale. Con la foto è la foto
 * scontornata su un piano (la sagoma è quella della foto); senza, la silhouette
 * estrusa nel colore della prima variante.
 */
export function FlatGarment({ product, garments, materials, position, rotation }) {
  const kind = garments.shapeByCategory[product.category]
  const fabric = useFabric(product, garments, materials)
  const photo = garmentPhoto(product)
  const photoMaterial = usePhotoMaterial(photo, garments, true)
  const geometry = photo
    ? getPhotoCardGeometry(photo, photo.aspect, kind === 'bottom' ? { height: garments.photo.bottomHeight } : { width: garments.photo.topWidth })
    : getGarmentGeometry(kind)
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={geometry} material={photoMaterial ?? fabric} castShadow receiveShadow />
      {kind === 'bottom' && !photo && <Cord position={[0, 0.47, 0.03]} length={0.26} color={garments.cordColor} />}
    </group>
  )
}

/**
 * Indicatore del capo selezionato in Focus Mode: l'ellisse del marchio, piccola.
 * Vive fuori dall'unione delle geometrie perché si sposta col prodotto attivo.
 * `transparent` con opacità 1: stesso aspetto, ma riusa lo shader già pronto
 * dell'anello del tap invece di compilarne uno suo a ogni Focus (docs/PERF.md).
 */
export function ActiveMarker({ position, color, ratio = 2.2 }) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} scale={[ratio, 1, 1]}>
      <ringGeometry args={[0.055, 0.068, 40]} />
      <meshBasicMaterial color={color} transparent toneMapped={false} />
    </mesh>
  )
}
