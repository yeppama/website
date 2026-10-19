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
  if (bw.sign && !assetIds.has(bw.sign.assetId)) fail('I18', `insegna: asset "${bw.sign.assetId}" inesistente`)
  if (!lookbookIds.has(bw.panel.lookbookId)) fail('I18', `pannello: lookbook "${bw.panel.lookbookId}" inesistente`)
  if (!materialIds.has(bw.panel.materialId)) fail('I18', `pannello: materiale "${bw.panel.materialId}" inesistente`)

  // I19 — espositori: tipo supportato, faretto esistente, POI reciproco, posa di
  // Focus con la camera fuori dai collider e dentro il negozio.
  const KINDS = new Set(['mannequin', 'plinth', 'rack', 'wall', 'pipeRack', 'chain', 'blockTable'])
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
    // Id ripetuti farebbero vendere la variante sbagliata (taglia o colore confusi).
    for (const [what, list] of [['colore', prod.colorways ?? []], ['taglia', prod.sizes ?? []]]) {
      const ids = list.map((x) => x.id)
      const dup = ids.find((id, i) => ids.indexOf(id) !== i)
      if (dup) fail('I20', `prodotto ${prod.id}: id di ${what} "${dup}" ripetuto`)
    }
  }

  // I21 — Lookbook e catalogo si citano a vicenda: un capo che dice di stare in un
  // lookbook ci compare, e viceversa. Senza, la Brand Story e la scheda divergono.
  const lookbookById = new Map(config.lookbook.map((l) => [l.id, l]))
  for (const l of config.lookbook) {
    for (const img of l.images) if (!ratioIds.has(img.ratio)) fail('I21', `lookbook ${l.id}: ratio "${img.ratio}" non previsto`)
    if (!l.images.length) fail('I21', `lookbook ${l.id}: nessuna immagine`)
    for (const pid of l.productIds) {
      const prod = config.products.find((x) => x.id === pid)
      if (!prod) fail('I21', `lookbook ${l.id}: prodotto "${pid}" inesistente`)
      else if (!prod.lookbookIds.includes(l.id)) fail('I21', `lookbook ${l.id}: il prodotto ${pid} non lo elenca (relazione non bidirezionale)`)
    }
  }
  for (const prod of config.products) {
    for (const lid of prod.lookbookIds) {
      const l = lookbookById.get(lid)
      if (!l) fail('I21', `prodotto ${prod.id}: lookbook "${lid}" inesistente`)
      else if (!l.productIds.includes(prod.id)) fail('I21', `prodotto ${prod.id}: il lookbook ${lid} non lo elenca (relazione non bidirezionale)`)
    }
  }

  // I22 — ogni scheda prodotto ha di che riempirsi: immagini, taglie e un prezzo
  // che la locale del brand sa formattare (una valuta sbagliata lancia a runtime).
  for (const prod of config.products) {
    if (!prod.media.length) fail('I22', `prodotto ${prod.id}: nessuna immagine`)
    if (!prod.sizes.length) fail('I22', `prodotto ${prod.id}: nessuna taglia`)
    try {
      new Intl.NumberFormat(config.meta.brand.locale, { style: 'currency', currency: prod.price.currency })
    } catch {
      fail('I22', `prodotto ${prod.id}: valuta "${prod.price.currency}" o locale "${config.meta.brand.locale}" non validi`)
    }
  }

  // I23 — ogni capo è collegato al commercio con un handle valido e unico: è la
  // chiave con cui il fornitore (Shopify) restituisce prezzo, varianti e giacenze.
  const handles = new Set()
  for (const prod of config.products) {
    const h = prod.commerce?.handle
    if (!h) { fail('I23', `prodotto ${prod.id}: commerce.handle mancante`); continue }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(h)) fail('I23', `prodotto ${prod.id}: handle "${h}" non valido (minuscole, cifre, trattini)`)
    if (handles.has(h)) fail('I23', `prodotto ${prod.id}: handle "${h}" duplicato`)
    handles.add(h)
  }

  // I24 — regole del commercio coerenti.
  const c = config.commerce
  if (!['off', 'mock', 'shopify'].includes(c?.provider)) fail('I24', `commerce.provider "${c?.provider}" non previsto`)
  if (!Number.isInteger(c?.maxQuantity) || c.maxQuantity < 1) fail('I24', 'commerce.maxQuantity deve essere un intero ≥ 1')
  if (!c?.cartStorageKey) fail('I24', 'commerce.cartStorageKey mancante')
  if (c?.provider === 'shopify' && !(c.shopify?.domain && c.shopify?.storefrontToken && c.shopify?.apiVersion)) {
    fail('I24', 'commerce.provider "shopify" senza dominio, token pubblico o versione API')
  }
  if (c?.shopify && !(c.shopify.optionNames?.size?.length && c.shopify.optionNames?.color?.length)) {
    fail('I24', 'commerce.shopify.optionNames: servono i nomi delle opzioni di taglia e colore')
  }

  // I25 — pagine legali: ogni voce legge un campo che la Storefront API espone davvero
  // (verificato sul negozio di sviluppo il 2026-10-16), ha un'etichetta nel menu e un id unico.
  const POLICY_FIELDS = ['termsOfSale', 'termsOfService', 'refundPolicy', 'shippingPolicy', 'privacyPolicy', 'legalNotice', 'contactInformation']
  const policyIds = new Set()
  for (const p of c?.policies ?? []) {
    if (!POLICY_FIELDS.includes(p.field)) fail('I25', `commerce.policies: campo Shopify "${p.field}" non previsto`)
    if (policyIds.has(p.id)) fail('I25', `commerce.policies: id "${p.id}" duplicato`)
    if (!config.copy.legal?.policies?.[p.id]) fail('I25', `commerce.policies: "${p.id}" senza etichetta in copy.legal.policies`)
    policyIds.add(p.id)
  }
  if (!config.copy.menu.sections.some((sec) => sec.id === 'sec-legal')) fail('I25', 'copy.menu.sections: manca la sezione "sec-legal"')

  // I15 — ogni istruzione dell'onboarding richiede una funzione che esiste nei
  // feature flag: altrimenti la riga non saprebbe se mostrarsi attiva o "in arrivo".
  const featureIds = new Set(Object.keys(config.features ?? {}))
  for (const variant of ['desktop', 'mobile']) {
    for (const line of [...config.copy.onboarding[variant].lines, ...(config.copy.onboarding[variant].mouseLines ?? [])]) {
      if (line.requires && !featureIds.has(line.requires)) {
        fail('I15', `onboarding ${variant}: "${line.text}" richiede la funzione inesistente "${line.requires}"`)
      }
    }
  }

  // I26 — foto (demo, 8c): una foto legata a un colore e la foto 3D di un colore citano
  // un colore del capo, e ogni colore ha almeno una foto che lo mostra (o nessuna
  // foto legata ai colori). Altrimenti scegliendo un colore la galleria resta vuota.
  for (const prod of config.products) {
    const colorIds = new Set(prod.colorways.map((c) => c.id))
    for (const m of prod.media) {
      if (m.colorwayId && !colorIds.has(m.colorwayId)) fail('I26', `prodotto ${prod.id}: foto ${m.id} legata al colore inesistente "${m.colorwayId}"`)
      if (m.src !== undefined && !/^\/[\w/.-]+$/.test(m.src)) fail('I26', `prodotto ${prod.id}: foto ${m.id} con indirizzo non valido "${m.src}"`)
    }
    for (const cid of Object.keys(prod.model3d?.byColorway ?? {})) {
      if (!colorIds.has(cid)) fail('I26', `prodotto ${prod.id}: foto 3D per il colore inesistente "${cid}"`)
    }
    for (const c of prod.colorways) {
      if (!prod.media.some((m) => !m.colorwayId || m.colorwayId === c.id)) fail('I26', `prodotto ${prod.id}: nessuna foto per il colore ${c.id}`)
    }
  }

  // I27 — indicatori a terra dei POI: sul pavimento del negozio e fuori da ogni
  // collider, o il tocco colpirebbe il mobile e l'anello finirebbe dentro un muro.
  for (const poi of config.pois) {
    if (!poi.floorMarker) continue
    if (!inAnyArea(poi.floorMarker, config.navigation.walkableAreas)) fail('I27', `poi ${poi.id}: indicatore a terra fuori dal negozio`)
    for (const c of config.colliders) {
      if (pointInCollider(poi.floorMarker, c, 0.05)) fail('I27', `poi ${poi.id}: indicatore a terra dentro il collider ${c.id}`)
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
  console.info('storeConfig: 27 invarianti verificate, nessun errore')
}
