/**
 * Validatore delle invarianti referenziali di storeConfig.
 *
 * Perché esiste: in un'architettura data-driven un ID sbagliato non è un errore di
 * compilazione, è un bug silenzioso che si manifesta come un muro attraversabile o
 * un faretto puntato nel vuoto. Qui gli errori diventano rumorosi e immediati.
 *
 * Gira solo in sviluppo: in produzione la chiamata viene eliminata dal bundle.
 */

const ids = (list) => new Set(list.map((item) => item.id))

/** Punto 2D dentro un box orientato? Usato per I9: nessun waypoint dentro un collider. */
function pointInCollider([x, z], collider, margin = 0) {
  const [cx, , cz] = collider.center
  const [sx, , sz] = collider.size
  const a = -(collider.rotationY || 0)
  const dx = x - cx
  const dz = z - cz
  const lx = dx * Math.cos(a) - dz * Math.sin(a)
  const lz = dx * Math.sin(a) + dz * Math.cos(a)
  return Math.abs(lx) <= sx / 2 + margin && Math.abs(lz) <= sz / 2 + margin
}

function inAnyArea([x, z], areas) {
  return areas.some(({ bounds: [[x0, z0], [x1, z1]] }) =>
    x >= Math.min(x0, x1) && x <= Math.max(x0, x1) &&
    z >= Math.min(z0, z1) && z <= Math.max(z0, z1))
}

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

  for (const qt of config.navigation.quickTravel) {
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
  console.info('storeConfig: 15 invarianti verificate, nessun errore')
}
