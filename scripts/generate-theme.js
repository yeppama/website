/**
 * Genera src/styles/theme.generated.css da src/config/designTokens.js.
 *
 * Perché esiste: i token servono in due mondi che non possono leggersi a vicenda —
 * le utility CSS di Tailwind e il codice JS (materiali three.js, texture su canvas,
 * disegno della minimappa). Scriverli due volte significa vederli divergere.
 * Qui la fonte unica è il file JS; il CSS è un prodotto, ed è in .gitignore.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tokens } from '../src/config/designTokens.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = resolve(root, 'src/styles/theme.generated.css')

// Contrasto minimo (WCAG 1.4.3, AA testo normale): ogni colore usato per il testo
// su ogni fondo su cui il testo compare. Un token cambiato sotto soglia ferma la
// build qui, invece di comparire solo in un controllo axe (audit 2026-11-02, N7).
// surface.3 resta fuori: oggi è solo un riempimento della minimappa, senza testo.
const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05) }
const C = tokens.color
const textColors = { 'text.primary': C.text.primary, 'text.secondary': C.text.secondary, 'text.muted': C.text.muted, 'state.danger': C.state.danger, 'accent.flame': C.accent.flame }
const grounds = { 'bg.base': C.bg.base, 'bg.raised': C.bg.raised, 'surface.1': C.surface[1], 'surface.2': C.surface[2] }
const low = []
for (const [tn, tv] of Object.entries(textColors)) {
  for (const [gn, gv] of Object.entries(grounds)) {
    const r = ratio(tv, gv)
    if (r < 4.5) low.push(`${tn} ${tv} su ${gn} ${gv}: ${r.toFixed(2)}:1`)
  }
}
if (low.length) {
  console.error(`contrasto sotto 4,5:1 (WCAG 1.4.3):\n  ${low.join('\n  ')}`)
  process.exit(1)
}

const lines = ['/* GENERATO da scripts/generate-theme.js — non modificare a mano. */', '@theme {']

for (const [group, values] of Object.entries(tokens.color)) {
  for (const [name, value] of Object.entries(values)) {
    lines.push(`  --color-${group}-${name}: ${value};`)
  }
}
for (const [name, value] of Object.entries(tokens.type.family)) {
  lines.push(`  --font-${name}: ${value};`)
}
for (const [name, value] of Object.entries(tokens.type.scale)) {
  lines.push(`  --text-${name}: ${value};`)
}
for (const [name, value] of Object.entries(tokens.type.tracking)) {
  lines.push(`  --tracking-${name}: ${value};`)
}
for (const [name, value] of Object.entries(tokens.space)) {
  lines.push(`  --spacing-s${name}: ${value};`)
}
for (const [name, value] of Object.entries(tokens.radius)) {
  lines.push(`  --radius-${name}: ${value};`)
}
lines.push('}')
lines.push('')
lines.push(':root {')
for (const [name, value] of Object.entries(tokens.z)) lines.push(`  --z-${name}: ${value};`)
for (const [name, value] of Object.entries(tokens.motion)) {
  lines.push(`  --motion-${name}: ${typeof value === 'number' ? `${value}ms` : value};`)
}
lines.push(`  --touch-min: ${tokens.touchTarget.min}px;`)
lines.push('}')

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, lines.join('\n') + '\n', 'utf8')
console.log(`theme.generated.css: ${lines.length} righe da designTokens.js`)
