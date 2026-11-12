<script setup>
// Titel, Untertitel und Theme der Website. Rechts eine Musterseite im gewählten Theme.
import { computed, ref } from 'vue'
import BlockAnzeige from '../../components/bloecke/BlockAnzeige.vue'
import ThemeRahmen from '../../components/ThemeRahmen.vue'
import { admin, melde } from '../../api.js'

// Vorlagen. Wählt man eine, werden alle Werte gesetzt; danach lässt sich jeder Wert einzeln ändern.
const VORLAGEN = {
  nord: { name: 'Nord', info: 'Hell, violett, modern', akzent: '#8470ff', flaeche: '#ddd8c4', modus: 'hell', schrift: 'modern', radius: 'normal' },
  corporate: { name: 'Corporate hell', info: 'Rot, sandfarbene Flächen, klare Kanten', akzent: '#d6001c', flaeche: '#ddd8c4', modus: 'hell', schrift: 'modern', radius: 'eckig' },
  studio: { name: 'Studio dunkel', info: 'Dunkel, Serif-Titel, runde Buttons', akzent: '#9b87ff', flaeche: '#1f2433', modus: 'dunkel', schrift: 'editorial', radius: 'rund' },
  klassisch: { name: 'Klassisch', info: 'Marineblau, Serifenschrift, ruhig', akzent: '#1e3a8a', flaeche: '#e8edf5', modus: 'hell', schrift: 'klassisch', radius: 'normal' },
}
const SCHRIFTEN = { modern: 'Modern (Inter)', editorial: 'Editorial (Serif-Titel, Inter-Text)', klassisch: 'Klassisch (alles Serif)', technisch: 'Technisch (Mono-Titel)' }
const RADIEN = { eckig: 'Eckig', normal: 'Normal', rund: 'Rund (Pillen-Buttons)' }

const e = ref({ title: '', tagline: '', startseite: '' })
const seiten = ref([])
admin.get('/posts?type=page&status=published').then(d => { seiten.value = d.items }).catch(() => {})
const t = ref({ ...VORLAGEN.nord, vorlage: 'nord' })
const speichert = ref(false)

admin.get('/settings').then(d => {
  e.value = { title: d.title || '', tagline: d.tagline || '', startseite: d.startseite || '' }
  t.value = { ...d.theme }
})

function vorlage(id) {
  const { name, info, ...werte } = VORLAGEN[id]
  t.value = { ...werte, vorlage: id }
}
// Wer einen Wert ändert, hat keine reine Vorlage mehr
const aendern = (feld, wert) => { t.value = { ...t.value, [feld]: wert, vorlage: 'eigen' } }

async function speichern() {
  speichert.value = true
  try {
    const { vorlage: v, akzent, flaeche, modus, schrift, radius } = t.value
    await admin.put('/settings', { ...e.value, theme: { vorlage: v || 'eigen', akzent, flaeche, modus, schrift, radius } })
    melde('Einstellungen gespeichert')
  } catch (err) {
    melde(err.message, 'fehler')
  } finally {
    speichert.value = false
  }
}

// Musterseite für die Vorschau, in der Form der Liefer-API
const muster = computed(() => [
  { id: 'h', typ: 'hero', variante: 'geteilt', eyebrow: e.value.tagline || 'Untertitel der Website', titel_html: `${e.value.title || 'Titel'} zeigt <em>dein Theme.</em>`,
    text: 'So sehen Überschriften, Text und Buttons mit diesen Einstellungen aus.', buttons: [{ text: 'Primär', link: '#', stil: 'primaer' }, { text: 'Umriss', link: '#', stil: 'umriss' }], bild: null },
  { id: 'l', typ: 'iconliste', titel: 'Fläche', spalten: 2, hintergrund: 'sand', eintraege: [{ icon: 'haken', text: 'Hintergrund „Fläche“' }, { icon: 'stern', text: 'Schrift passt sich an' }] },
  { id: 't', typ: 'text', html: '<h2>Zwischenüberschrift</h2><p>Fließtext mit einem <a href="#">Link in der Akzentfarbe</a> und <strong>fetten</strong> Stellen.</p>' },
  { id: 'b', typ: 'buttons', ausrichtung: 'mitte', hintergrund: 'akzent', eintraege: [{ text: 'Auf der Akzentfläche', link: '#', stil: 'umriss' }] },
])
</script>

<template>
  <h1 class="mb-8 text-2xl font-bold md:text-3xl">Einstellungen</h1>
  <div class="grid items-start gap-6 2xl:grid-cols-[34rem_1fr]">
    <form class="space-y-6" @submit.prevent="speichern">
      <div class="karte space-y-5 p-6">
        <div><label class="etikett">Titel der Website</label><input v-model="e.title" class="feld" maxlength="100" /></div>
        <div><label class="etikett">Untertitel</label><input v-model="e.tagline" class="feld" maxlength="200" /></div>
        <div>
          <label class="etikett">Startseite</label>
          <select v-model="e.startseite" class="feld">
            <option value="">Neueste Beiträge</option>
            <option v-for="s in seiten" :key="s.id" :value="s.slug">Seite: {{ s.title }}</option>
          </select>
          <p class="mt-1 text-xs text-gray-400">Mit einer Seite als Startseite stehen die Beiträge unter /blog.</p>
        </div>
      </div>

      <div class="karte space-y-5 p-6">
        <h2 class="font-semibold">Theme</h2>
        <div class="grid grid-cols-2 gap-3">
          <button v-for="(v, id) in VORLAGEN" :key="id" type="button" class="rounded-lg border p-3 text-left"
            :class="t.vorlage === id ? 'border-violet-400 bg-violet-500/10' : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'" @click="vorlage(id)">
            <span class="mb-2 flex gap-1">
              <span class="size-4 rounded-full ring-1 ring-black/10" :style="{ background: v.akzent }" />
              <span class="size-4 rounded-full ring-1 ring-black/10" :style="{ background: v.flaeche }" />
              <span class="size-4 rounded-full ring-1 ring-black/10" :style="{ background: v.modus === 'dunkel' ? '#111827' : '#ffffff' }" />
            </span>
            <span class="block text-sm font-semibold text-gray-800 dark:text-gray-100">{{ v.name }}</span>
            <span class="text-xs text-gray-500">{{ v.info }}</span>
          </button>
        </div>
        <p v-if="t.vorlage === 'eigen'" class="text-xs text-gray-400">Eigene Einstellungen, ausgehend von einer Vorlage.</p>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="etikett">Akzentfarbe</label>
            <div class="flex gap-2">
              <input type="color" :value="t.akzent" class="h-9 w-12 cursor-pointer rounded border border-gray-200 dark:border-gray-700" @input="aendern('akzent', $event.target.value)" />
              <input :value="t.akzent" class="feld font-mono" maxlength="7" pattern="#[0-9a-fA-F]{6}" @change="aendern('akzent', $event.target.value)" />
            </div>
          </div>
          <div>
            <label class="etikett">Fläche</label>
            <div class="flex gap-2">
              <input type="color" :value="t.flaeche" class="h-9 w-12 cursor-pointer rounded border border-gray-200 dark:border-gray-700" @input="aendern('flaeche', $event.target.value)" />
              <input :value="t.flaeche" class="feld font-mono" maxlength="7" pattern="#[0-9a-fA-F]{6}" @change="aendern('flaeche', $event.target.value)" />
            </div>
          </div>
          <div>
            <label class="etikett">Modus</label>
            <div class="flex gap-2">
              <button v-for="[m, n] in [['hell', 'Hell'], ['dunkel', 'Dunkel']]" :key="m" type="button" class="flex-1 rounded-lg border px-3 py-2 text-sm"
                :class="t.modus === m ? 'border-violet-400 bg-violet-500/10 text-violet-600 dark:text-violet-300' : 'border-gray-200 dark:border-gray-700'"
                @click="aendern('modus', m)">{{ n }}</button>
            </div>
          </div>
          <div>
            <label class="etikett">Ecken</label>
            <select :value="t.radius" class="feld" @change="aendern('radius', $event.target.value)">
              <option v-for="(n, r) in RADIEN" :key="r" :value="r">{{ n }}</option>
            </select>
          </div>
          <div class="col-span-2">
            <label class="etikett">Schrift</label>
            <select :value="t.schrift" class="feld" @change="aendern('schrift', $event.target.value)">
              <option v-for="(n, s) in SCHRIFTEN" :key="s" :value="s">{{ n }}</option>
            </select>
          </div>
        </div>
        <p class="text-xs text-gray-400">Die Schriftfarbe auf Akzent und Fläche wählt die Website selbst (hell oder dunkel, je nach Kontrast).</p>
      </div>

      <button class="knopf-haupt w-full" :disabled="speichert">Speichern</button>
    </form>

    <div class="karte sticky top-20 overflow-hidden">
      <div class="border-b border-gray-100 px-4 py-2 text-xs text-gray-400 dark:border-gray-700/60">Vorschau</div>
      <ThemeRahmen :theme="t" class="bg-white dark:bg-gray-900">
        <BlockAnzeige :bloecke="muster" />
      </ThemeRahmen>
    </div>
  </div>
</template>
