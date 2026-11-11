// Theme der Website: wenige, geprüfte Stellschrauben statt freiem CSS.
// Gespeichert als JSON in settings.theme. Die Website macht daraus CSS-Variablen (web/src/components/ThemeRahmen.vue).
const farbe = { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' }

export const themeSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['akzent', 'flaeche', 'modus', 'schrift', 'radius'],
  properties: {
    vorlage: { type: 'string', pattern: '^[a-z0-9-]{1,30}$' },
    akzent: farbe,                                                     // Buttons, Links, Hervorhebungen
    flaeche: farbe,                                                    // Hintergrund „Sand“ in Blöcken
    modus: { type: 'string', enum: ['hell', 'dunkel'] },
    schrift: { type: 'string', enum: ['modern', 'editorial', 'klassisch', 'technisch'] },
    radius: { type: 'string', enum: ['eckig', 'normal', 'rund'] },
  },
}

export const STANDARD_THEME = { vorlage: 'nord', akzent: '#8470ff', flaeche: '#ddd8c4', modus: 'hell', schrift: 'modern', radius: 'normal' }

// Gespeichertes Theme lesen. Kaputtes oder fehlendes JSON ergibt das Standard-Theme.
export function leseTheme(wert) {
  try {
    const t = JSON.parse(wert)
    return t && typeof t === 'object' ? { ...STANDARD_THEME, ...t } : { ...STANDARD_THEME }
  } catch {
    return { ...STANDARD_THEME }
  }
}
