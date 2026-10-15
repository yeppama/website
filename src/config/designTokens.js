/**
 * Design token — fonte unica di verità per colori, tipografia e ritmo.
 *
 * Palette derivata dall'identità INTO industries: nero profondo e osso come
 * i due fondi del brand, ember come unico accento acceso, crimson in dosi minime.
 * Nessun componente definisce un colore per conto proprio.
 */
export const tokens = {
  color: {
    bg:      { base: '#060606', raised: '#0c0c0d', studio: '#dcdcd8' },
    surface: { 1: '#101011', 2: '#17171a', 3: '#202024' },
    line:    { subtle: '#232326', strong: '#3a3a40', hard: '#f2f0ea' },
    text:    { primary: '#f2f0ea', secondary: '#9b9b96', muted: '#5c5c58', inverse: '#060606' },
    accent:  { ember: '#ff5a1f', crimson: '#c21025', bone: '#f2f0ea' },
    state:   { danger: '#c21025', ok: '#9b9b96' },
  },

  type: {
    // Tre registri. Il gotico è riservato ai titoli di schermata: mai in un bottone.
    family: {
      gothic:  '"UnifrakturCook", "Pirata One", serif',
      display: '"Archivo", "Arial Narrow", system-ui, sans-serif',
      mono:    '"JetBrains Mono", ui-monospace, "SFMono-Regular", monospace',
    },
    scale: {
      xs: '0.6875rem', sm: '0.8125rem', base: '0.9375rem',
      lg: '1.25rem', xl: '2rem', '2xl': '3.25rem', '3xl': '5rem',
    },
    tracking: { tight: '-0.02em', normal: '0', wide: '0.08em', brutal: '0.18em' },
    weight: { regular: 400, bold: 700, black: 900 },
  },

  space:  { 0: '0', 1: '4px', 2: '8px', 3: '12px', 4: '16px', 6: '24px', 8: '32px', 12: '48px', 16: '64px' },
  radius: { none: '0', sm: '2px' },        // spigoli vivi, nessuna eccezione
  border: { hairline: '1px', thick: '2px' },
  motion: { fast: 140, base: 240, slow: 420, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
  z: { canvas: 0, hotspot: 10, hud: 20, quickTravel: 25, modal: 40, onboarding: 50, fallback: 60 },
  breakpoint: { sm: 480, md: 768, lg: 1024, xl: 1440 },
  touchTarget: { min: 44 },
}

/**
 * L'ellisse del marchio è il motivo geometrico ricorrente: ombra a terra,
 * hotspot di prossimità, bordo dei bottoni primari. Le proporzioni stanno qui
 * perché servono sia alla UI sia alla scena 3D.
 */
export const brandMotif = {
  oval: { ratio: 2.9, strokeRatio: 0.055 },
}
