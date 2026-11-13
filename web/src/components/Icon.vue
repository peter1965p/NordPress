<script setup>
// Eigene, schlichte Linien-Icons (24er Raster), damit keine Icon-Bibliothek nötig ist.
import { SYMBOLE } from './symbole.js'
defineProps({ name: { type: String, required: true }, klasse: { type: String, default: 'size-5' } })
const PFADE = {
  ...Object.fromEntries(Object.entries(SYMBOLE).map(([k, [, d]]) => [k, d])),
  hoch: 'M6 15l6-6 6 6',
  code: 'M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14',
  formular: 'M4 4h16v16H4zM8 8h8M8 12h8M8 16h3M14 16h2',
  runter: 'M6 9l6 6 6-6',
  kopie: 'M8 8h12v12H8zM16 8V4H4v12h4',
  griff: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  dashboard: 'M4 5h6v6H4zM14 5h6v4h-6zM14 13h6v6h-6zM4 15h6v4H4z',
  beitrag: 'M5 4h10l4 4v12H5zM15 4v4h4M8 12h8M8 16h6',
  seite: 'M6 3h9l3 3v15H6zM9 9h6M9 13h6M9 17h3',
  medien: 'M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15 9.5a1.5 1.5 0 1 0 0-.01',
  kategorie: 'M4 6h7l2 2h7v11H4z',
  tag: 'M3 12V4h8l10 10-8 8zM7.5 8a.5.5 0 1 0 0-.01',
  benutzer: 'M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 3.15a4 4 0 0 1 0 7.7',
  einstellungen: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1',
  plus: 'M12 5v14M5 12h14',
  suche: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14M20 20l-4-4',
  mond: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5',
  sonne: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  menue: 'M4 6h16M4 12h16M4 18h16',
  schliessen: 'M6 6l12 12M18 6L6 18',
  extern: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  abmelden: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4',
  muell: 'M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3',
  hochladen: 'M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
  auge: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
  stift: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  pfeil: 'M15 18l-6-6 6-6',
}
</script>

<template>
  <svg :class="klasse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path :d="PFADE[name] || PFADE.punkt" />
  </svg>
</template>
