import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { tokens } from '../../config/designTokens.js'
import { getMaterial } from '../../lib/materials.js'
import { loadSharedTexture } from '../../lib/sharedTextures.js'
import { whenFontsReady, makeWordmarkSign, makeLookbookPanel } from '../../lib/canvasText.js'

/**
 * Parete del brand: insegna (il logo del marchio, o il wordmark nell'ellisse
 * finché il logo manca) e, sotto, il pannello del Lookbook. È il punto di fuga
 * dell'inquadratura d'ingresso.
 *
 * L'insegna è un materiale non illuminato e fuori dal tone mapping: si comporta
 * come un segno retroilluminato, con l'arancio esatto del token e non quello
 * che il tone mapping restituirebbe.
 */
export default function BrandWall({ brandWall, brand, lookbook, assets, materials, copy }) {
  const [textures, setTextures] = useState(null)
  const entry = lookbook.find((l) => l.id === brandWall.panel.lookbookId)
  const logo = assets.registry[brandWall.sign.assetId]

  useEffect(() => {
    let alive = true
    let made = null
    Promise.all([whenFontsReady(), signTexture(logo, brand, brandWall)]).then(([, sign]) => {
      if (!alive) {
        // La parete è già smontata: la texture del wordmark è di questo
        // componente e non la libererebbe nessun altro (quella condivisa sì).
        if (sign && !sign.shared) sign.texture.dispose()
        return
      }
      const panel = makeLookbookPanel({
        title: entry.title,
        subtitle: entry.subtitle,
        eyebrow: copy.brandWall.eyebrow,
        corner: copy.brandWall.corner,
        accentColor: tokens.color.accent.flame,
        textColor: tokens.color.text.primary,
        bg: materials[brandWall.panel.materialId].color,
      })
      made = { sign, panel }
      setTextures(made)
    })
    return () => {
      alive = false
      // La texture condivisa appartiene alla cache di sharedTextures.js, che la
      // libera con l'ultimo Canvas: liberarla qui la farebbe sparire al prossimo
      // rimontaggio della scena.
      if (made?.sign && !made.sign.shared) made.sign.texture.dispose()
      made?.panel.dispose()
    }
  }, [brand, brandWall, entry, logo, materials, copy])

  const panelMaterial = useMemo(() => {
    if (!textures) return null
    const base = getMaterial(brandWall.panel.materialId, materials[brandWall.panel.materialId])
    const m = base.clone()
    m.map = textures.panel
    m.color = new THREE.Color(0xffffff)
    return m
  }, [textures, brandWall.panel.materialId, materials])
  // Il clone è di questo componente, non della cache: lo libera lui.
  useEffect(() => () => panelMaterial?.dispose(), [panelMaterial])

  // Materiale dell'insegna costruito qui e non in JSX: con una mappa condivisa,
  // un materiale creato da React Three Fiber porterebbe con sé la texture della
  // cache quando lo smontaggio lo libera.
  const signMaterial = useMemo(() => {
    if (!textures?.sign) return null
    return new THREE.MeshBasicMaterial({
      map: textures.sign.texture,
      transparent: true,
      toneMapped: false,
      depthWrite: false,
    })
  }, [textures])
  useEffect(() => () => signMaterial?.dispose(), [signMaterial])

  if (!textures) return null
  const { sign, panel } = brandWall

  return (
    <group>
      {textures.sign && (
        <mesh position={sign.center} material={signMaterial}>
          <planeGeometry args={[sign.width, sign.width / textures.sign.aspect]} />
        </mesh>
      )}
      <mesh position={panel.center} material={panelMaterial} receiveShadow>
        <planeGeometry args={panel.size} />
      </mesh>
    </group>
  )
}

/**
 * L'insegna: il file di `logo.url` quando c'è, altrimenti il wordmark
 * tipografico. Se il file non arriva (indirizzo sbagliato, rete caduta) torna
 * al wordmark: la parete non deve restare vuota in silenzio, che è il difetto
 * più difficile da notare — l'invariante I28 controlla la forma dell'indirizzo,
 * ma non può sapere se il server risponde.
 *
 * `shared: true` dice a chi la riceve che la texture è della cache di
 * sharedTextures.js e non va liberata dal componente.
 */
async function signTexture(logo, brand, brandWall) {
  const wordmark = () => ({
    ...makeWordmarkSign({
      wordmark: brand.wordmark,
      descriptor: brand.descriptor,
      ovalColor: brandWall.sign.color,
      textColor: logo.tint.onDark,
      accentColor: brandWall.sign.color,
    }),
    shared: false,
  })

  if (!logo.url) return wordmark()
  try {
    const texture = await loadSharedTexture(logo.url)
    const { width, height } = texture.image
    if (!width || !height) throw new Error('immagine senza dimensioni')
    return { texture, aspect: width / height, shared: true }
  } catch (err) {
    console.warn(`insegna: logo "${logo.url}" non caricato, si usa il wordmark`, err)
    return wordmark()
  }
}
