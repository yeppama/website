/**
 * Scelta del tier da stringhe GPU reali (quelle riportate in docs/PERF.md e
 * quelle tipiche di WebGL su Windows, macOS e Android).
 *
 *   npm run test:device
 */
import { pickTier } from '../src/lib/deviceProfile.js'

const desktop = (renderer, cores = 8, memory = 8) => ({ pointer: 'fine', cores, memory, renderer })
const cases = [
  ['Vivobook · Iris Xe (misurato: 31 fps in high)', desktop('ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x00009A49) Direct3D11 vs_5_0 ps_5_0, D3D11)'), 'medium'],
  ['Intel UHD', desktop('ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)'), 'medium'],
  ['Radeon integrata', desktop('ANGLE (AMD, AMD Radeon(TM) Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)', 8, 16), 'medium'],
  ['Apple M2 base', desktop('ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)'), 'medium'],
  ['GeForce RTX', desktop('ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)', 12, 16), 'high'],
  ['Radeon RX', desktop('ANGLE (AMD, AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)', 8, 16), 'high'],
  ['Apple M1 Pro', desktop('ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version)', 10, 8), 'high'],
  ['GPU dedicata, poca memoria', desktop('ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Direct3D11)', 4, 4), 'medium'],
  ['Renderer sconosciuto', desktop('sconosciuto'), 'medium'],
  ['Pixel · PowerVR (misurato: 60 fps in medium)', { pointer: 'coarse', cores: 8, memory: 8, renderer: 'ANGLE (Imagination Technologies, PowerVR D-Series DXT-48-1536, OpenGL ES 3.2)' }, 'medium'],
  ['Telefono con 4 core', { pointer: 'coarse', cores: 4, memory: 4, renderer: 'Adreno (TM) 610' }, 'low'],
  ['SwiftShader', desktop('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)'), 'low'],
]

let failed = 0
for (const [name, input, want] of cases) {
  const got = pickTier(input)
  if (got !== want) failed++
  console.log(`${got === want ? '  ✓' : '  ✗'} ${name} → ${got}${got === want ? '' : ` (atteso ${want})`}`)
}
console.log(`\n${cases.length - failed}/${cases.length} test superati`)
process.exit(failed ? 1 : 0)
