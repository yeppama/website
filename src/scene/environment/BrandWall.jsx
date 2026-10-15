import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { tokens } from '../../config/designTokens.js'
import { getMaterial } from '../../lib/materials.js'
import { whenFontsReady, makeWordmarkSign, makeLookbookPanel } from '../../lib/canvasText.js'

/**
 * Parete del brand: insegna (wordmark nell'ellisse del marchio) e, sotto, il
 * pannello del Lookbook. È il punto di fuga dell'inquadratura d'ingresso.
 *
 * L'insegna è un materiale non illuminato e fuori dal tone mapping: si comporta
 * come un segno retroilluminato, con l'arancio esatto del token e non quello
 * che il tone mapping restituirebbe.
 */
export default function BrandWall({ brandWall, brand, lookbook, assets, materials }) {
  const [textures, setTextures] = useState(null)
  const entry = lookbook.find((l) => l.id === brandWall.panel.lookbookId)
  const logo = assets.registry[brandWall.sign.assetId]

  useEffect(() => {
    let alive = true
    whenFontsReady().then(() => {
      if (!alive) return
      // P1: finché manca il logo vettoriale (`url: null`) si usa il fallback tipografico.
      const sign = logo.url ? null : makeWordmarkSign({
        wordmark: brand.wordmark,
        descriptor: brand.descriptor,
        ovalColor: brandWall.sign.color,
        textColor: logo.tint.onDark,
        accentColor: brandWall.sign.color,
      })
      const panel = makeLookbookPanel({
        title: entry.title,
        subtitle: entry.subtitle,
        accentColor: tokens.color.accent.flame,
        textColor: tokens.color.text.primary,
        bg: materials[brandWall.panel.materialId].color,
      })
      setTextures({ sign, panel })
    })
    return () => { alive = false }
  }, [brand, brandWall, entry, logo, materials])

  const panelMaterial = useMemo(() => {
    if (!textures) return null
    const base = getMaterial(brandWall.panel.materialId, materials[brandWall.panel.materialId])
    const m = base.clone()
    m.map = textures.panel
    m.color = new THREE.Color(0xffffff)
    return m
  }, [textures, brandWall.panel.materialId, materials])

  if (!textures) return null
  const { sign, panel } = brandWall

  return (
    <group>
      {textures.sign && (
        <mesh position={sign.center}>
          <planeGeometry args={[sign.width, sign.width / textures.sign.aspect]} />
          <meshBasicMaterial map={textures.sign.texture} transparent toneMapped={false} depthWrite={false} />
        </mesh>
      )}
      <mesh position={panel.center} material={panelMaterial} receiveShadow>
        <planeGeometry args={panel.size} />
      </mesh>
    </group>
  )
}
