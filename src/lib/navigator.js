import { pointInCollider, segmentHitsCollider, inAnyArea } from './geometry.js'

/**
 * Pianificazione dei percorsi automatici (tap-to-move e avvicinamento ai POI).
 *
 * Garanzia: ogni segmento restituito è libero da collider, con margine pari al
 * raggio del player. Il percorso è:
 *   1. diretto, se il segmento posizione → destinazione è libero;
 *   2. altrimenti: nodo visibile dalla posizione → percorso minimo sul grafo dei
 *      waypoint (Dijkstra) → nodo visibile dalla destinazione → destinazione;
 *   3. poi "tirato" (string pulling): si saltano i nodi intermedi quando il
 *      segmento che li scavalca è comunque libero. Più naturale, sempre valido.
 */
export function createNavigator(config) {
  const { waypoints, links, player, walkableAreas } = config.navigation
  const colliders = config.colliders
  const r = player.radius

  const nodes = new Map(waypoints.map((w) => [w.id, [w.position[0], w.position[2]]]))
  const adj = new Map(waypoints.map((w) => [w.id, []]))
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])
  for (const [a, b] of links) {
    const d = dist(nodes.get(a), nodes.get(b))
    adj.get(a).push([b, d])
    adj.get(b).push([a, d])
  }

  const clear = (a, b) => !colliders.some((c) => segmentHitsCollider(a, b, c, r))
  const isWalkable = (p) => inAnyArea(p, walkableAreas) && !colliders.some((c) => pointInCollider(p, c, r))

  /** Dijkstra da un nodo: costo e predecessore verso tutti gli altri. Il grafo è piccolo. */
  function dijkstra(startId) {
    const cost = new Map([[startId, 0]])
    const prev = new Map()
    const open = new Set([startId])
    while (open.size) {
      let cur = null
      for (const id of open) if (cur === null || cost.get(id) < cost.get(cur)) cur = id
      open.delete(cur)
      for (const [next, w] of adj.get(cur)) {
        const cand = cost.get(cur) + w
        if (cand < (cost.get(next) ?? Infinity)) {
          cost.set(next, cand)
          prev.set(next, cur)
          open.add(next)
        }
      }
    }
    return { cost, prev }
  }

  function pull(from, points) {
    const out = []
    let cur = from
    let i = 0
    while (i < points.length) {
      let j = points.length - 1
      while (j > i && !clear(cur, points[j])) j--
      out.push(points[j])
      cur = points[j]
      i = j + 1
    }
    return out
  }

  /**
   * Percorso da `from` a `to`. Se il player è appoggiato a un collider (il box
   * allargato del pianificatore ha angoli vivi, la fisica angoli arrotondati) ogni
   * segmento che parte da lì risulta bloccato: si riprova da un punto libero a pochi
   * centimetri, che il player raggiunge con il primo passo.
   * @returns {{ok: true, points: number[][]} | {ok: false, reason: 'blocked'|'unreachable'}}
   */
  function plan(from, to) {
    const direct = planFrom(from, to)
    if (direct.ok || direct.reason === 'blocked' || isWalkable(from)) return direct
    for (const step of [0.1, 0.2, 0.35]) {
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2
        const p = [from[0] + Math.cos(a) * step, from[1] + Math.sin(a) * step]
        if (!isWalkable(p)) continue
        const res = planFrom(p, to)
        if (res.ok) return { ok: true, points: [p, ...res.points] }
      }
    }
    return direct
  }

  function planFrom(from, to) {
    if (!isWalkable(to)) return { ok: false, reason: 'blocked' }
    if (clear(from, to)) return { ok: true, points: [to] }

    // Tutti i nodi visibili, non solo i più vicini: con le colonne, il nodo più
    // vicino è spesso proprio quello nascosto.
    const starts = [...nodes.entries()].filter(([, n]) => clear(from, n))
    const goals = [...nodes.entries()].filter(([, n]) => clear(n, to))

    let best = null
    for (const [sId, s] of starts) {
      const { cost, prev } = dijkstra(sId)
      for (const [gId, gp] of goals) {
        if (!cost.has(gId)) continue
        const total = dist(from, s) + cost.get(gId) + dist(gp, to)
        if (!best || total < best.total) {
          const ids = [gId]
          while (prev.has(ids[0])) ids.unshift(prev.get(ids[0]))
          best = { total, ids }
        }
      }
    }
    if (!best) return { ok: false, reason: 'unreachable' }
    return { ok: true, points: pull(from, [...best.ids.map((id) => nodes.get(id)), to]) }
  }

  return { plan, isWalkable, clear, nodes }
}
