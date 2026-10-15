/**
 * Rileva il profilo del dispositivo e sceglie il tier prestazionale.
 *
 * Il tier NON è scritto nei componenti: è una chiave dentro performance.tiers
 * di storeConfig, così la politica di qualità resta configurabile.
 */

/** Il puntatore è grossolano (dito) o fine (mouse)? Più affidabile dello user agent. */
export function detectPointer() {
  if (typeof window === 'undefined') return 'fine'
  const coarse = window.matchMedia?.('(pointer: coarse)').matches
  const noHover = window.matchMedia?.('(hover: none)').matches
  return coarse || noHover ? 'coarse' : 'fine'
}

export function detectWebGL2() {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2')
    if (!gl) return { supported: false, renderer: null }
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'sconosciuto'
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE)
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return { supported: true, renderer, maxTextureSize }
  } catch {
    return { supported: false, renderer: null }
  }
}

/**
 * Sceglie il tier. Deliberatamente prudente: su puntatore grossolano non si sale
 * mai sopra `medium`, perché un telefono potente resta un telefono che si scalda.
 */
export function pickTier({ pointer, cores, memory, renderer }) {
  const software = /swiftshader|llvmpipe|software/i.test(renderer ?? '')
  if (software) return 'low'
  if (pointer === 'coarse') return cores >= 6 && memory >= 4 ? 'medium' : 'low'
  if (cores >= 8 && memory >= 8) return 'high'
  if (cores >= 4) return 'medium'
  return 'low'
}

export { zoneAt } from './geometry.js'

export function getDeviceProfile() {
  const pointer = detectPointer()
  const webgl = detectWebGL2()
  const cores = navigator.hardwareConcurrency ?? 4
  const memory = navigator.deviceMemory ?? 4
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  const params = new URLSearchParams(window.location.search)
  const forced = params.get('debug') && params.get('tier')
  const tier = ['high', 'medium', 'low'].includes(forced)
    ? forced
    : pickTier({ pointer, cores, memory, renderer: webgl.renderer })
  return {
    pointer,
    isTouch: pointer === 'coarse',
    cores,
    memory,
    reducedMotion,
    tier,
    webgl2: webgl.supported,
    renderer: webgl.renderer,
  }
}

