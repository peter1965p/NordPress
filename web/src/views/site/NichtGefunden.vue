<script setup>
// 404: Hero mit Leuchtturm und Möwen. Der Server schickt dazu den Status 404 (api/src/routes/seite.js).
import { onMounted } from 'vue'
import HeroBlock from '../../components/bloecke/HeroBlock.vue'
import { setzeMeta } from '../../api.js'

const b = {
  id: '404', typ: 'hero', variante: 'hintergrund', deko: 'norden', ausrichtung: 'links', abdunkeln: 0,
  eyebrow: 'Fehler 404 · Seite nicht gefunden',
  // fester Text, kein Inhalt von außen
  titel_html: 'Sorry, das was du gerade suchst, <em>haben wir nicht!</em>',
  text: 'Vielleicht hat eine Möwe es mitgenommen. Oder der Wind hat es weggeweht, es ist ja Norddeutschland.',
  buttons: [{ text: 'Zur Startseite', link: '/', stil: 'primaer' }, { text: 'Zum Blog', link: '/blog', stil: 'umriss' }],
}
onMounted(() => setzeMeta({ titel: '404 · Nicht gefunden' }))
</script>

<template>
  <div class="@container">
    <HeroBlock :b="b" class="min-h-[75dvh]" />
  </div>
</template>
