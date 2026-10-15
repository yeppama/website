/**
 * Validatore delle invarianti referenziali di storeConfig.
 *
 * Perché esiste: in un'architettura data-driven un ID sbagliato non è un errore di
 * compilazione, è un bug silenzioso che si manifesta come un muro attraversabile o
 * un faretto puntato nel vuoto. Qui gli errori diventano rumorosi e immediati.
 *
 * Gira solo in sviluppo: in produzione la chiamata viene eliminata dal bundle.
 */

import { pointInCollider, segmentHitsCollider, inAnyArea } from '../lib/geometry.js'

const ids = (list) => new Set(list.map((item) => item.id))

export function validateStoreConfig(config) {
  const errors = []
  const fail = (code, message) => errors.push(`[${code}] ${message}`)

  const colliderIds = ids(config.colliders)
  const waypointIds = ids(config.navigation.waypoints)
  const productIds = ids(config.products)
  const displayIds = ids(config.displays)
  const poiIds = ids(config.pois)
  const lookbookIds = ids(config.lookbook)
  const materialIds = new Set(Object.keys(config.lighting.materials))
  const assetIds = new Set(Object.keys(config.assets.registry))
  const ratioIds = new Set(Object.keys(config.placeholders.ratios))
  const waypointById = new Map(config.navigation.waypoints.map((w) => [w.id, w]))

  for (const d of config.displays) {
    if (!colliderIds.has(d.colliderId)) fail('I1', `display ${d.id}: colliderId "${d.colliderId}" inesistente`)
    if (!waypointIds.has(d.approachWaypointId)) fail('I2', `display ${d.id}: approachWaypointId "${d.approachWaypointId}" inesistente`)
    for (const pid of d.productIds) if (!productIds.has(pid)) fail('I3', `display ${d.id}: prodotto "${pid}" inesistente`)
    if (d.poiId && !poiIds.has(d.poiId)) fail('I5', `display ${d.id}: poiId "${d.poiId}" inesistente`)
    if (!assetIds.has(d.assetId)) fail('I12', `display ${d.id}: assetId "${d.assetId}" inesistente`)
    for (const mid of Object.values(d.materialIds ?? {})) {
      if (!materialIds.has(mid)) fail('I11', `display ${d.id}: materiale "${mid}" inesistente`)
    }
  }

  for (const p of config.products) {
    if (!displayIds.has(p.displayId)) { fail('I4', `prodotto ${p.id}: displayId "${p.displayId}" inesistente`); continue }
    const d = config.displays.find((x) => x.id === p.displayId)
    if (!d.productIds.includes(p.id)) fail('I4', `prodotto ${p.id}: il display ${d.id} non lo elenca (relazione non bidirezionale)`)
    for (const m of p.media) if (!ratioIds.has(m.ratio)) fail('I13', `prodotto ${p.id}: ratio "${m.ratio}" non previsto`)
  }

  for (const poi of config.pois) {
    if (!waypointIds.has(poi.approachWaypointId)) fail('I5', `poi ${poi.id}: approachWaypointId "${poi.approachWaypointId}" inesistente`)
    if (poi.requires && !(poi.requires in (config.features ?? {}))) fail('I15', `poi ${poi.id}: richiede la funzione inesistente "${poi.requires}"`)
    if (poi.targetDisplayId && !displayIds.has(poi.targetDisplayId)) fail('I5', `poi ${poi.id}: display "${poi.targetDisplayId}" inesistente`)
    if (poi.targetLookbookId && !lookbookIds.has(poi.targetLookbookId)) fail('I5', `poi ${poi.id}: lookbook "${poi.targetLookbookId}" inesistente`)
  }

  for (const [a, b] of config.navigation.links) {
    if (!waypointIds.has(a) || !waypointIds.has(b)) fail('I6', `link [${a}, ${b}]: waypoint inesistente`)
  }

  // I7 — il grafo deve essere un'unica componente connessa, o su mobile ci sono zone irraggiungibili.
  if (config.navigation.waypoints.length > 0) {
    const adj = new Map(config.navigation.waypoints.map((w) => [w.id, []]))
    for (const [a, b] of config.navigation.links) {
      if (adj.has(a) && adj.has(b)) { adj.get(a).push(b); adj.get(b).push(a) }
    }
    const seen = new Set([config.navigation.waypoints[0].id])
    const queue = [config.navigation.waypoints[0].id]
    while (queue.length) {
      for (const next of adj.get(queue.pop())) if (!seen.has(next)) { seen.add(next); queue.push(next) }
    }
    if (seen.size !== waypointIds.size) {
      const orphans = [...waypointIds].filter((id) => !seen.has(id))
      fail('I7', `grafo non connesso: ${orphans.join(', ')} irraggiungibili`)
    }
  }

  const zoneIdsForQt = ids(config.environment.zones)
  for (const qt of config.navigation.quickTravel) {
    if (!zoneIdsForQt.has(qt.zoneId)) fail('I8', `quickTravel ${qt.id}: zona "${qt.zoneId}" inesistente`)
    const w = waypointById.get(qt.waypointId)
    if (!w) fail('I8', `quickTravel ${qt.id}: waypoint "${qt.waypointId}" inesistente`)
    else if (!w.safeForTeleport) fail('I8', `quickTravel ${qt.id}: "${w.id}" non è marcato safeForTeleport`)
  }

  const margin = config.navigation.player.radius
  for (const w of config.navigation.waypoints) {
    const [x, , z] = w.position
    for (const c of config.colliders) {
      if (pointInCollider([x, z], c, margin)) fail('I9', `waypoint ${w.id} cade dentro il collider ${c.id}`)
    }
    if (!inAnyArea([x, z], config.navigation.walkableAreas)) fail('I10', `waypoint ${w.id} è fuori da ogni walkableArea`)
  }

  for (const wall of config.environment.walls) {
    if (!materialIds.has(wall.materialId)) fail('I11', `muro ${wall.id}: materiale "${wall.materialId}" inesistente`)
    if (!colliderIds.has(wall.colliderId)) fail('I1', `muro ${wall.id}: colliderId "${wall.colliderId}" inesistente`)
  }
  if (!materialIds.has(config.environment.floor.materialId)) fail('I11', 'pavimento: materiale inesistente')
  if (!materialIds.has(config.environment.ceiling.materialId)) fail('I11', 'soffitto: materiale inesistente')

  for (const spot of config.lighting.spots) {
    if (spot.targetDisplayId && !displayIds.has(spot.targetDisplayId)) fail('I14', `faretto ${spot.id}: display "${spot.targetDisplayId}" inesistente`)
    if (!spot.targetPosition && !spot.targetDisplayId) fail('I14', `faretto ${spot.id}: nessun bersaglio`)
  }

  // I16 — nessun collegamento del grafo attraversa un collider, con un margine pari
  // al raggio del player. In Fase 3 questi segmenti sono i percorsi che il player
  // camminerà: un link che taglia una colonna è un player che ci passa attraverso.
  for (const [a, b] of config.navigation.links) {
    const wa = waypointById.get(a)
    const wb = waypointById.get(b)
    if (!wa || !wb) continue
    for (const c of config.colliders) {
      if (segmentHitsCollider([wa.position[0], wa.position[2]], [wb.position[0], wb.position[2]], c, margin)) {
        fail('I16', `link [${a} → ${b}] attraversa il collider ${c.id}`)
      }
    }
  }

  // I17 — inquadrature: zona esistente, camera fuori dai collider, default valido.
  const zoneIds = ids(config.environment.zones)
  const shotIds = ids(config.camera.shots)
  if (!shotIds.has(config.camera.defaultShotId)) fail('I17', `defaultShotId "${config.camera.defaultShotId}" inesistente`)
  for (const shot of config.camera.shots) {
    if (!zoneIds.has(shot.zoneId)) fail('I17', `inquadratura ${shot.id}: zona "${shot.zoneId}" inesistente`)
    for (const c of config.colliders) {
      if (pointInCollider([shot.position[0], shot.position[2]], c, 0.2)) fail('I17', `inquadratura ${shot.id}: camera dentro il collider ${c.id}`)
    }
  }

  // I18 — architettura e parete del brand: riferimenti validi.
  const arch = config.environment.architecture
  for (const col of arch.columns) {
    if (!colliderIds.has(col.colliderId)) fail('I18', `colonna ${col.id}: colliderId "${col.colliderId}" inesistente`)
    if (!materialIds.has(col.materialId)) fail('I18', `colonna ${col.id}: materiale "${col.materialId}" inesistente`)
  }
  for (const pl of arch.platforms) {
    if (!zoneIds.has(pl.zoneId)) fail('I18', `pedana ${pl.id}: zona "${pl.zoneId}" inesistente`)
    if (!materialIds.has(pl.materialId)) fail('I18', `pedana ${pl.id}: materiale "${pl.materialId}" inesistente`)
  }
  for (const tr of arch.ceilingTracks) {
    if (!materialIds.has(tr.materialId)) fail('I18', `binario ${tr.id}: materiale "${tr.materialId}" inesistente`)
  }
  const bw = config.environment.brandWall
  if (!assetIds.has(bw.sign.assetId)) fail('I18', `insegna: asset "${bw.sign.assetId}" inesistente`)
  if (!lookbookIds.has(bw.panel.lookbookId)) fail('I18', `pannello: lookbook "${bw.panel.lookbookId}" inesistente`)
  if (!materialIds.has(bw.panel.materialId)) fail('I18', `pannello: materiale "${bw.panel.materialId}" inesistente`)

  // I19 — espositori: tipo supportato, faretto esistente, POI reciproco, posa di
  // Focus con la camera fuori dai collider e dentro il negozio.
  const KINDS = new Set(['mannequin', 'plinth', 'rack', 'wall'])
  const spotIds = ids(config.lighting.spots)
  const poiById = new Map(config.pois.map((x) => [x.id, x]))
  for (const d of config.displays) {
    if (!KINDS.has(d.kind)) fail('I19', `display ${d.id}: tipo "${d.kind}" non supportato`)
    if (!spotIds.has(d.spotlightId)) fail('I19', `display ${d.id}: faretto "${d.spotlightId}" inesistente`)
    if (!d.productIds.length) fail('I19', `display ${d.id}: nessun prodotto`)
    const poi = poiById.get(d.poiId)
    if (poi && poi.targetDisplayId !== d.id) fail('I19', `display ${d.id}: il POI ${poi.id} punta a "${poi.targetDisplayId}" (relazione non reciproca)`)
    const [fx, , fz] = d.focusCamera.position
    for (const c of config.colliders) {
      if (pointInCollider([fx, fz], c, 0.15)) fail('I19', `display ${d.id}: camera di Focus dentro il collider ${c.id}`)
    }
    if (!inAnyArea([fx, fz], config.navigation.walkableAreas)) fail('I19', `display ${d.id}: camera di Focus fuori dal negozio`)
  }

  // I20 — ogni prodotto ha una forma segnaposto per la sua categoria e almeno una variante colore.
  for (const prod of config.products) {
    if (!config.garments.shapeByCategory[prod.category]) fail('I20', `prodotto ${prod.id}: nessuna forma per la categoria "${prod.category}"`)
    if (!prod.colorways?.length) fail('I20', `prodotto ${prod.id}: nessuna variante colore`)
  }

  // I15 — ogni istruzione dell'onboarding richiede una funzione che esiste nei
  // feature flag: altrimenti la riga non saprebbe se mostrarsi attiva o "in arrivo".
  const featureIds = new Set(Object.keys(config.features ?? {}))
  for (const variant of ['desktop', 'mobile']) {
    for (const line of config.copy.onboarding[variant].lines) {
      if (line.requires && !featureIds.has(line.requires)) {
        fail('I15', `onboarding ${variant}: "${line.text}" richiede la funzione inesistente "${line.requires}"`)
      }
    }
  }

  return errors
}

/** Chiamato una volta all'avvio. In produzione non fa nulla. */
export function assertStoreConfig(config) {
  if (!import.meta.env?.DEV) return
  const errors = validateStoreConfig(config)
  if (errors.length) {
    console.error(`storeConfig: ${errors.length} invarianti violate\n` + errors.join('\n'))
    throw new Error(`storeConfig non valido (${errors.length} errori) — vedi console`)
  }
  console.info('storeConfig: 20 invarianti verificate, nessun errore')
}
