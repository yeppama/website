import * as THREE from 'three'
import { brandMotif } from '../config/designTokens.js'

/**
 * Texture tipografiche generate su <canvas>: insegna, pannelli, marcature a terra.
 *
 * Usano i font auto-ospitati, quindi prima di disegnare aspettano che siano
 * davvero caricati: un canvas disegnato troppo presto userebbe il font di
 * sistema e resterebbe sbagliato per sempre, perché la texture non si ridisegna.
 */

const FONTS = ['900 120px "Archivo"', '700 60px "Archivo"', '400 40px "JetBrains Mono"', '700 40px "JetBrains Mono"']
let fontsReady = null
export function whenFontsReady() {
  fontsReady ??= Promise.all(FONTS.map((f) => document.fonts.load(f))).catch(() => null)
  return fontsReady
}

function makeTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

/**
 * Insegna: il wordmark dentro l'ellisse del marchio. È il fallback tipografico
 * di P1 — quando arriverà il logo vettoriale, sostituirà questa funzione.
 */
export function makeWordmarkSign({ wordmark, descriptor, ovalColor, textColor, accentColor }) {
  const ratio = brandMotif.oval.ratio
  const h = 500
  const w = Math.round(h * ratio)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')

  const stroke = h * brandMotif.oval.strokeRatio * 1.6
  ctx.strokeStyle = ovalColor
  ctx.lineWidth = stroke
  ctx.beginPath()
  ctx.ellipse(w / 2, h / 2, w / 2 - stroke, h / 2 - stroke, 0, 0, Math.PI * 2)
  ctx.stroke()

  ctx.fillStyle = textColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `900 ${Math.round(h * 0.4)}px "Archivo"`
  ctx.fillText(wordmark, w / 2, h * 0.44)

  ctx.fillStyle = accentColor
  // Il descrittore deve restare leggibile anche dall'ingresso, a ~30 m.
  ctx.font = `700 ${Math.round(h * 0.115)}px "JetBrains Mono"`
  ctx.fillText(`(${descriptor}*)`, w / 2, h * 0.76)

  return { texture: makeTexture(canvas), aspect: w / h }
}

/** Pannello del Lookbook: segnaposto editoriale con titolo e trama diagonale. */
export function makeLookbookPanel({ title, subtitle, accentColor, textColor, bg, width = 1280, height = 400 }) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)

  ctx.strokeStyle = 'rgba(255,255,255,0.05)'
  ctx.lineWidth = 2
  for (let x = -height; x < width; x += 22) {
    ctx.beginPath(); ctx.moveTo(x, height); ctx.lineTo(x + height, 0); ctx.stroke()
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  ctx.lineWidth = 2
  ctx.strokeRect(14, 14, width - 28, height - 28)

  ctx.fillStyle = accentColor
  ctx.fillRect(48, 64, 10, height - 128)

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = 'rgba(242,240,234,0.55)'
  ctx.font = '400 26px "JetBrains Mono"'
  ctx.fillText('LOOKBOOK · BRAND STORY', 84, 96)

  ctx.fillStyle = textColor
  ctx.font = '900 150px "Archivo"'
  ctx.fillText(title, 80, 250)

  ctx.fillStyle = 'rgba(242,240,234,0.55)'
  ctx.font = '400 26px "JetBrains Mono"'
  ctx.fillText(subtitle.toUpperCase(), 84, 316)

  ctx.textAlign = 'right'
  ctx.fillStyle = accentColor
  ctx.fillText('PLH · IN ARRIVO FASE 5', width - 48, height - 48)

  return makeTexture(canvas)
}

/** Marcatura tecnica a pavimento: numero di zona, nome, identificativo. */
export function makeFloorLabel({ index, label, id, accentColor, textColor }) {
  const width = 1024
  const height = 256
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.fillStyle = accentColor
  ctx.font = '700 64px "JetBrains Mono"'
  ctx.fillText(String(index).padStart(2, '0'), 24, 150)

  ctx.fillStyle = textColor
  ctx.font = '900 104px "Archivo"'
  ctx.fillText(label.toUpperCase(), 140, 156)

  ctx.fillStyle = 'rgba(242,240,234,0.5)'
  ctx.font = '400 28px "JetBrains Mono"'
  ctx.fillText(id.toUpperCase(), 144, 208)

  ctx.fillRect(24, 226, width - 48, 3)
  return makeTexture(canvas)
}

/** Ombra "blob" (D3-A): gradiente radiale, usato quando il tier non ha ombre reali. */
let blobTexture = null
export function getBlobTexture() {
  if (blobTexture) return blobTexture
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(0,0,0,1)')
  g.addColorStop(0.45, 'rgba(0,0,0,0.55)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  blobTexture = makeTexture(canvas)
  return blobTexture
}

/**
 * Hotspot: l'ellisse del marchio con un punto al centro e l'etichetta del POI.
 * Indipendente dai modelli 3D (Fase 4): rappresenta il POI configurato.
 */
export function makeHotspot({ label, color, textColor }) {
  const w = 512
  const h = 256
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  const ovalH = 92
  const ovalW = ovalH * brandMotif.oval.ratio
  ctx.strokeStyle = color
  ctx.lineWidth = 10
  ctx.beginPath()
  ctx.ellipse(w / 2, 62, ovalW / 2 - 6, ovalH / 2 - 6, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(w / 2, 62, 11, 0, Math.PI * 2)
  ctx.fill()

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.font = '700 40px "JetBrains Mono"'
  const text = label.toUpperCase()
  const tw = ctx.measureText(text).width
  ctx.fillStyle = 'rgba(6,6,6,0.72)'
  ctx.fillRect(w / 2 - tw / 2 - 16, 140, tw + 32, 58)
  ctx.fillStyle = textColor
  ctx.fillText(text, w / 2, 183)
  return makeTexture(canvas)
}
