import { useMemo } from 'react'
import { storeConfig } from '../../config/storeConfig.js'

/**
 * Minimappa disegnata interamente da storeConfig: pianta del pavimento, zone,
 * waypoint e posa della camera. Nessuna coordinata scritta a mano.
 *
 * In Fase 1b l'indicatore "sei qui" mostra la camera statica; in Fase 3
 * diventerà la posizione reale del player senza cambiare questo componente.
 */
export default function Minimap({ activeZoneId }) {
  const { environment, navigation, camera } = storeConfig
  const [w, d] = environment.floor.size
  const pad = 2

  const project = useMemo(
    () => (x, z) => [((x + w / 2) / w) * 100, ((z + d / 2) / d) * 100],
    [w, d],
  )

  const [cx, cz] = project(camera.staticPose.position[0], camera.staticPose.position[2])

  return (
    <div className="w-36 sm:w-44">
      <p className="micro mb-2">pianta</p>
      <div
        className="relative border border-line-subtle bg-surface-1"
        style={{ aspectRatio: `${w} / ${d}` }}
      >
        <svg viewBox={`0 0 100 100`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          {environment.zones.map((zone) => {
            const [[x0, z0], [x1, z1]] = zone.bounds
            const [ax, az] = project(Math.min(x0, x1), Math.min(z0, z1))
            const [bx, bz] = project(Math.max(x0, x1), Math.max(z0, z1))
            const active = zone.id === activeZoneId
            return (
              <rect
                key={zone.id}
                x={ax} y={az} width={bx - ax} height={bz - az}
                fill={active ? 'var(--color-accent-ember)' : 'var(--color-surface-3)'}
                fillOpacity={active ? 0.35 : 0.55}
                stroke={active ? 'var(--color-accent-ember)' : 'var(--color-line-subtle)'}
                strokeWidth="0.6"
                vectorEffect="non-scaling-stroke"
              />
            )
          })}
          {environment.walls.map((wall) => {
            const [ax, az] = project(wall.from[0], wall.from[1])
            const [bx, bz] = project(wall.to[0], wall.to[1])
            return (
              <line key={wall.id} x1={ax} y1={az} x2={bx} y2={bz}
                stroke="var(--color-line-strong)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            )
          })}
          {navigation.waypoints.filter((wp) => wp.label).map((wp) => {
            const [x, z] = project(wp.position[0], wp.position[2])
            return <circle key={wp.id} cx={x} cy={z} r="1.6" fill="var(--color-text-muted)" />
          })}
          {/* "Sei qui": l'ellisse del marchio, ancora una volta. */}
          <ellipse cx={cx} cy={cz} rx="4" ry="2.2"
            fill="none" stroke="var(--color-accent-ember)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          <circle cx={cx} cy={cz} r="1.4" fill="var(--color-accent-ember)" />
        </svg>
      </div>
      <p className="micro mt-2">
        {w}×{d} m · {environment.zones.length} zone
      </p>
    </div>
  )
}
