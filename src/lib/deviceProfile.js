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

// GPU dedicate: le sole che PLAN §5.1 mette nel tier high. Le integrate (Intel
// Iris/UHD, Radeon integrate, Apple M base) sono il riferimento del tier medium.
const DISCRETE_GPU = /nvidia|geforce|quadro|rtx|gtx|radeon\s*(rx|pro)|apple m\d+ (pro|max|ultra)/i

// GPU dei telefoni economici: vanno in low anche con 8 core e 4+ GB. Misurato: un
// Honor con Adreno 619 (8 core) finiva in medium e rendeva a 9,7 fps (docs/PERF.md).
// Adreno sotto la serie 650, Mali G31/G51/G52/G57/G68 e serie T, PowerVR GE/GM.
const BUDGET_MOBILE_GPU = /adreno\s*\(tm\)\s*([1-5]\d\d|6[0-4]\d)\b|mali-g(31|51|52|57|68)\b|mali-t\d|powervr rogue g[em]/i

/**
 * Sceglie il tier. Deliberatamente prudente: su puntatore grossolano non si sale
 * mai sopra `medium`, perché un telefono potente resta un telefono che si scalda.
 * Su desktop CPU e memoria non bastano: fino alla Fase 6 un portatile con Iris Xe
 * (8 core, 8 GB) finiva in high e rendeva a 31 fps (docs/PERF.md).
 */
export function pickTier({ pointer, cores, memory, renderer }) {
  const software = /swiftshader|llvmpipe|software/i.test(renderer ?? '')
  if (software) return 'low'
  if (pointer === 'coarse') {
    // Safari su iOS non espone la memoria e dichiara meno core di quelli reali: con
    // la regola generale ogni iPhone finiva in low, a DPR 1 su schermi a densità 3.
    // Misurato: un iPhone con Safari 26 regge medium a 58,8 / 55,6 fps (docs/PERF.md).
    if (/apple gpu/i.test(renderer ?? '')) return 'medium'
    if (BUDGET_MOBILE_GPU.test(renderer ?? '')) return 'low'
    return cores >= 6 && memory >= 4 ? 'medium' : 'low'
  }
  if (DISCRETE_GPU.test(renderer ?? '') && cores >= 8 && memory >= 8) return 'high'
  if (cores >= 4) return 'medium'
  return 'low'
}


export function getDeviceProfile() {
  const pointer = detectPointer()
  const webgl = detectWebGL2()
  const cores = navigator.hardwareConcurrency ?? 4
  const memory = navigator.deviceMemory ?? 4
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  const params = new URLSearchParams(window.location.search)
  // Il tier si può forzare per le verifiche (debug) e per misurare un tier
  // preciso su un dispositivo vero (perf, bench).
  const forced = (params.get('debug') || params.get('perf') || params.get('bench')) && params.get('tier')
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

