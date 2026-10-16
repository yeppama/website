/**
 * Ripulisce l'HTML che arriva da fuori (le pagine legali scritte dal venditore su
 * Shopify) prima di metterlo nella pagina. Lista di tag ammessi, nessun attributo
 * tranne `href` dei link assoluti http(s), mailto e tel; script, stili, immagini,
 * iframe e moduli spariscono col loro contenuto, gli altri tag sconosciuti lasciano
 * solo il testo. I titoli scendono di livello: il titolo della scheda è l'h2.
 *
 * DOMParser crea un documento inerte: niente script eseguiti, niente risorse caricate.
 * Solo nel browser.
 */
const KEEP = new Set(['P', 'BR', 'UL', 'OL', 'LI', 'STRONG', 'B', 'EM', 'I', 'U', 'A', 'BLOCKQUOTE',
  'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'SMALL', 'SUB', 'SUP', 'HR', 'H3', 'H4'])
const DROP = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'FRAME', 'OBJECT', 'EMBED', 'NOSCRIPT', 'TEMPLATE', 'SVG',
  'MATH', 'FORM', 'INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'LINK', 'META', 'BASE', 'IMG', 'VIDEO', 'AUDIO',
  'SOURCE', 'PICTURE', 'CANVAS', 'TITLE', 'HEAD'])
const RENAME = { H1: 'H3', H2: 'H3', H3: 'H4', H4: 'H4', H5: 'H4', H6: 'H4' }
const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:'])

function safeHref(raw) {
  if (!raw) return null
  try {
    // Una base fittizia smaschera i link relativi: porterebbero al dominio del sito.
    const url = new URL(raw.trim(), 'relative://x/')
    return url.protocol !== 'relative:' && SAFE_PROTOCOLS.has(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

function clean(node, doc) {
  for (const child of [...node.childNodes]) {
    if (child.nodeType === 3) continue                              // testo
    if (child.nodeType !== 1) { child.remove(); continue }         // commenti e altro
    const tag = child.tagName.toUpperCase()
    if (DROP.has(tag)) { child.remove(); continue }
    clean(child, doc)
    const target = RENAME[tag] ?? tag
    if (!KEEP.has(target)) { child.replaceWith(...child.childNodes); continue }   // resta il testo
    const el = doc.createElement(target.toLowerCase())
    el.append(...child.childNodes)
    if (target === 'A') {
      const href = safeHref(child.getAttribute('href'))
      if (!href) { child.replaceWith(...el.childNodes); continue }
      el.setAttribute('href', href)
      el.setAttribute('target', '_blank')
      el.setAttribute('rel', 'noopener noreferrer')
    }
    child.replaceWith(el)
  }
}

export function sanitizeHtml(html) {
  const doc = new DOMParser().parseFromString(`<!doctype html><body>${html ?? ''}</body>`, 'text/html')
  clean(doc.body, doc)
  return doc.body.innerHTML
}
