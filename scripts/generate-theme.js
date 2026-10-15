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
