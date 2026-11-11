<script setup>
// Setzt das Theme der Website als CSS-Variablen auf einen Rahmen. Benutzt von der Website,
// der Live-Vorschau im Editor und der Theme-Seite. Werte kommen geprüft vom Server (api/src/lib/theme.js).
import { computed } from 'vue'

const props = defineProps({ theme: { type: Object, default: null } })

const SERIF = 'ui-serif, Georgia, Cambria, "Times New Roman", serif'
const SANS = '"Inter Variable", ui-sans-serif, system-ui, sans-serif'
const MONO = 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace'
const SCHRIFT = {
  modern: [SANS, SANS],
  editorial: [SERIF, SANS],
  klassisch: [SERIF, SERIF],
  technisch: [MONO, SANS],
}
const RADIUS = { eckig: ['0', '0'], normal: ['0.75rem', '0.5rem'], rund: ['1.5rem', '9999px'] }

// Helle Farbe -> dunkle Schrift, dunkle Farbe -> weiße Schrift (relative Leuchtdichte nach WCAG)
function schriftAuf(hex) {
  const k = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2] > 0.4 ? '#111827' : '#ffffff'
}

const gueltig = h => /^#[0-9a-f]{6}$/i.test(h || '')

const stil = computed(() => {
  const t = props.theme
  if (!t) return {}
  const [titel, text] = SCHRIFT[t.schrift] || SCHRIFT.modern
  const [radius, knopf] = RADIUS[t.radius] || RADIUS.normal
  const s = { '--np-titel': titel, '--np-text': text, '--np-radius': radius, '--np-radius-knopf': knopf }
  if (gueltig(t.akzent)) Object.assign(s, { '--np-akzent': t.akzent, '--np-akzent-text': schriftAuf(t.akzent) })
  if (gueltig(t.flaeche)) Object.assign(s, { '--np-flaeche': t.flaeche, '--np-flaeche-text': schriftAuf(t.flaeche) })
  return s
})
const modus = computed(() => (props.theme?.modus === 'dunkel' ? 'dark' : 'hell'))
</script>

<template>
  <div :class="modus" :style="stil" class="font-text">
    <slot />
  </div>
</template>
