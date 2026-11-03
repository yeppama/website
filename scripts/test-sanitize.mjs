/**
 * Test unitario del filtro HTML delle pagine legali (src/lib/sanitizeHtml.js).
 *
 * Perché esiste: il filtro è l'unica difesa fra l'HTML scritto su Shopify e la
 * pagina, e finora lo copriva solo `e2e-phase8a`, che non gira sui push di sola
 * documentazione (audit 2026-11-02, §4-bis punto 1). Qui gira in Node con jsdom,
 * il cui parser HTML segue la specifica come quello del browser.
 *
 *   npm run test:sanitize
 */
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'

const { window } = new JSDOM('')
globalThis.DOMParser = window.DOMParser
const { sanitizeHtml } = await import('../src/lib/sanitizeHtml.js')

const results = []
const test = (name, fn) => { try { fn(); results.push(['ok', name]) } catch (e) { results.push(['FAIL', name, e.message]) } }
const parse = (html) => new window.DOMParser().parseFromString(`<body>${html}</body>`, 'text/html').body

// Niente di eseguibile, in nessuna forma: tag, attributi, protocolli, varianti di maiuscole e spazi.
const FORBIDDEN = /<(script|style|iframe|img|svg|math|form|input|button|object|embed|link|meta|base|template|noscript|video|audio)\b|\son\w+=|style=|javascript:|data:|vbscript:/i

test('script, stili, immagini, iframe, moduli e svg spariscono col loro contenuto', () => {
  const out = sanitizeHtml('<p>ok</p><script>alert(1)</script><style>body{}</style><img src=x onerror=alert(1)><iframe src="https://e.x"></iframe><form><input><button>b</button></form><svg><script>alert(1)</script></svg>')
  assert.equal(out, '<p>ok</p>')
})

test('attributi on*, style, class e id tolti da ogni tag ammesso', () => {
  const out = sanitizeHtml('<p onclick="x()" style="color:red" class="c" id="i">t</p><a href="https://a.b" onmouseover="x()">l</a>')
  assert.doesNotMatch(out, FORBIDDEN)
  assert.doesNotMatch(out, /class=|id=/)
})

test('link: solo http(s), mailto e tel assoluti; aperti a parte con noopener', () => {
  const body = parse(sanitizeHtml('<a href="https://ok.example/x">a</a><a href="mailto:a@b.c">m</a><a href="tel:+39">t</a>'))
  const links = [...body.querySelectorAll('a')]
  assert.equal(links.length, 3)
  for (const a of links) { assert.equal(a.getAttribute('target'), '_blank'); assert.equal(a.getAttribute('rel'), 'noopener noreferrer') }
})

test('link pericolosi o relativi diventano testo', () => {
  for (const href of ['javascript:alert(1)', ' JaVaScRiPt:alert(1)', 'java\tscript:alert(1)', 'data:text/html,<script>alert(1)</script>',
    'vbscript:x', '/policies/x', '//evil.example/x', '?a=1', '#x', '']) {
    const out = sanitizeHtml(`<a href="${href.replace(/"/g, '&quot;')}">x</a>`)
    assert.equal(parse(out).querySelector('a'), null, `href ${JSON.stringify(href)} conservato: ${out}`)
  }
})

test('titoli scendono di livello: niente h1 o h2 dentro la scheda', () => {
  const out = sanitizeHtml('<h1>a</h1><h2>b</h2><h3>c</h3><h6>d</h6>')
  assert.equal(out, '<h3>a</h3><h3>b</h3><h4>c</h4><h4>d</h4>')
})

test('tag sconosciuti lasciano solo il testo; commenti via', () => {
  assert.equal(sanitizeHtml('<div><span>uno</span> <custom-x>due</custom-x></div><!-- nota -->'), 'uno due')
})

test('mutation XSS: HTML che cambia forma al secondo parsing resta innocuo', () => {
  for (const evil of [
    '<noscript><p title="</noscript><img src=x onerror=alert(1)>">',
    '<svg><p><style><img src=x onerror=alert(1)></style></p></svg>',
    '<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>',
    '<form><math><mtext></form><form><mglyph><style></math><img src onerror=alert(1)>',
    '<a href="https://ok.example/"><img src=x onerror=alert(1)></a>',
    '<table><td><script>alert(1)</script></td></table>',
  ]) {
    const once = sanitizeHtml(evil)
    // Il risultato va messo in pagina con innerHTML: lo si riparsa e lo si ricontrolla.
    const again = parse(once).innerHTML
    assert.doesNotMatch(again, FORBIDDEN, `${evil} → ${again}`)
  }
})

test('input vuoto o assente: stringa vuota, nessuna eccezione', () => {
  assert.equal(sanitizeHtml(''), '')
  assert.equal(sanitizeHtml(null), '')
  assert.equal(sanitizeHtml(undefined), '')
})

for (const [s, n, note] of results) console.log(`${s === 'ok' ? '  ✓' : '  ✗'} ${n}${note ? ` — ${note}` : ''}`)
const failed = results.filter((r) => r[0] === 'FAIL').length
console.log(`\n${results.length - failed}/${results.length} test superati`)
process.exit(failed ? 1 : 0)
