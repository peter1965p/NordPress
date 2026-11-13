<script setup>
// Eingabefelder je Blocktyp. Feldnamen und Grenzen wie im Schema der API (api/src/lib/bloecke.js).
import { defineAsyncComponent, inject, ref } from 'vue'
import Icon from '../Icon.vue'
import MedienWahl from '../MedienWahl.vue'
import KnopfListe from './KnopfListe.vue'
import TextEditor from './TextEditor.vue'
import { SYMBOLE } from '../symbole.js'
import { HINTERGRUENDE, SPRACHEN } from '../../bloecke/typen.js'
import { admin, oeffentlich } from '../../api.js'

// Monaco erst laden, wenn ein Code-Block sichtbar wird
const CodeEditor = defineAsyncComponent(() => import('./CodeEditor.vue'))
defineEmits(['als-code'])
defineProps({ neu: Boolean })

const b = defineModel({ type: Object, required: true })
const bilder = inject('bilder')
const waehlen = ref(false)

// Kategorien für „Neueste Beiträge“, nur wenn so ein Block da ist
const kategorien = ref([])
if (b.value.typ === 'beitraege') oeffentlich('/categories').then(d => { kategorien.value = d.items }).catch(() => {})

// Formulare für den Block „Formular“
const formulare = ref([])
if (b.value.typ === 'formular' || b.value.typ === 'karten') admin.get('/forms').then(d => { formulare.value = d.items }).catch(() => {})

function bildGewaehlt(m) {
  bilder.set(m.id, { url: m.url, alt: m.alt })
  b.value.bild_id = m.id
  waehlen.value = false
}
</script>

<template>
  <!-- Text -->
  <TextEditor v-if="b.typ === 'text'" v-model="b.doc" @als-code="$emit('als-code', $event)" />

  <!-- Code -->
  <div v-else-if="b.typ === 'code'">
    <div class="flex items-center gap-3 border-b border-gray-100 px-4 py-2 dark:border-gray-700/60">
      <select v-model="b.sprache" class="feld w-40 py-1">
        <option v-for="(n, s) in SPRACHEN" :key="s" :value="s">{{ n }}</option>
      </select>
      <input v-model="b.dateiname" class="feld py-1 font-mono text-xs" maxlength="120" placeholder="Dateiname (optional), z. B. nginx.conf" />
    </div>
    <CodeEditor v-model="b.quelle" :sprache="b.sprache" :fokus="neu" />
  </div>

  <!-- Markdown -->
  <textarea v-else-if="b.typ === 'markdown'" v-model="b.quelle" maxlength="200000"
    class="min-h-48 w-full resize-y border-0 bg-transparent px-5 py-4 font-mono text-sm leading-relaxed text-gray-800 focus:ring-0 focus:outline-none dark:text-gray-200"
    placeholder="## Überschrift&#10;&#10;Text mit **fett**, *kursiv* und [Links](https://…)." />

  <!-- Hero -->
  <div v-else-if="b.typ === 'hero'" class="grid gap-4 p-5 @3xl:grid-cols-[1fr_14rem]">
    <div class="space-y-3">
      <div class="flex gap-2">
        <button v-for="[v, n] in [['hintergrund', 'Bild im Hintergrund'], ['geteilt', 'Text links, Bild rechts'], ['logo', 'Logo oben, Text darunter']]" :key="v" type="button"
          class="flex-1 rounded-lg border px-3 py-2 text-sm" :class="(b.variante || 'hintergrund') === v ? 'border-violet-400 bg-violet-500/10 text-violet-600 dark:text-violet-300' : 'border-gray-200 dark:border-gray-700'"
          @click="b.variante = v">{{ n }}</button>
      </div>
      <div><label class="etikett">Kleine Zeile über dem Titel</label><input v-model="b.eyebrow" class="feld" maxlength="80" placeholder="z. B. FÜR KLEINE APPS UND IDEEN" /></div>
      <div>
        <label class="etikett">Titel</label>
        <input v-model="b.titel" class="feld text-base font-semibold" maxlength="200" />
        <p class="mt-1 text-xs text-gray-400">*so* wird kursiv und in der Akzentfarbe, **so** fett.</p>
      </div>
      <div><label class="etikett">Untertitel</label><input v-model="b.untertitel" class="feld" maxlength="200" /></div>
      <div><label class="etikett">Text</label><textarea v-model="b.text" rows="2" class="feld" maxlength="1000" /></div>
      <div><label class="etikett">Buttons</label><KnopfListe v-model="b.buttons" /></div>
      <div><label class="etikett">Kleingedrucktes unter den Buttons</label><input v-model="b.hinweis" class="feld" maxlength="500" /></div>
    </div>
    <div class="space-y-3">
      <label class="etikett">Bild</label>
      <div v-if="b.bild_id" class="space-y-1">
        <img v-if="bilder.get(b.bild_id)" :src="bilder.get(b.bild_id).url" alt="" class="aspect-video w-full rounded-lg object-cover" />
        <p v-else class="text-xs text-amber-500">Bild nicht mehr vorhanden</p>
        <div class="flex gap-3 text-sm">
          <button type="button" class="font-medium text-violet-500" @click="waehlen = true">Ändern</button>
          <button type="button" class="font-medium text-red-500" @click="b.bild_id = null">Entfernen</button>
        </div>
      </div>
      <button v-else type="button" class="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-gray-200 py-6 text-sm text-gray-400 hover:border-violet-300 hover:text-violet-500 dark:border-gray-700" @click="waehlen = true">
        <Icon name="medien" klasse="size-6" /> Bild wählen
      </button>
      <div v-if="(b.variante || 'hintergrund') === 'hintergrund'">
        <label class="etikett">Abdunkeln: {{ b.abdunkeln ?? 40 }} %</label>
        <input v-model.number="b.abdunkeln" type="range" min="0" max="90" step="5" class="w-full accent-violet-500" />
        <p v-if="b.bild_id && (b.abdunkeln ?? 40) < 30" class="mt-1 text-xs text-amber-500">Weißer Text auf hellem Bild ist kaum lesbar. Mehr abdunkeln oder für Logos „Logo oben, Text darunter“ wählen.</p>
      </div>
      <div>
        <label class="etikett">Ausrichtung</label>
        <select v-model="b.ausrichtung" class="feld"><option value="mitte">Mittig</option><option value="links">Links</option></select>
      </div>
      <div v-if="!b.bild_id && (b.variante || 'hintergrund') === 'hintergrund'">
        <label class="etikett">Deko ohne Bild</label>
        <select v-model="b.deko" class="feld"><option :value="undefined">Keine</option><option value="norden">Norden: Leuchtturm und Wellen</option></select>
        <p v-if="b.deko === 'norden'" class="mt-1 text-xs text-gray-400">Am besten mit Ausrichtung „Links“.</p>
      </div>
    </div>
    <MedienWahl v-if="waehlen" @gewaehlt="bildGewaehlt" @schliessen="waehlen = false" />
  </div>

  <!-- Buttons -->
  <div v-else-if="b.typ === 'buttons'" class="space-y-3 p-5">
    <KnopfListe v-model="b.eintraege" :mindestens="1" />
    <div class="grid grid-cols-2 gap-3">
      <div><label class="etikett">Ausrichtung</label><select v-model="b.ausrichtung" class="feld"><option value="mitte">Mittig</option><option value="links">Links</option></select></div>
      <div><label class="etikett">Hintergrund</label><select v-model="b.hintergrund" class="feld"><option v-for="(n, h) in HINTERGRUENDE" :key="h" :value="h">{{ n }}</option></select></div>
    </div>
  </div>

  <!-- Karten -->
  <div v-else-if="b.typ === 'karten'" class="space-y-4 p-5">
    <div class="grid grid-cols-[1fr_7rem_9rem] gap-3">
      <div><label class="etikett">Überschrift</label><input v-model="b.titel" class="feld" maxlength="200" /></div>
      <div><label class="etikett">Spalten</label><select v-model.number="b.spalten" class="feld"><option v-for="n in [2, 3, 4]" :key="n" :value="n">{{ n }}</option></select></div>
      <div><label class="etikett">Hintergrund</label><select v-model="b.hintergrund" class="feld"><option v-for="(n, h) in HINTERGRUENDE" :key="h" :value="h">{{ n }}</option></select></div>
    </div>
    <div><label class="etikett">Text unter der Überschrift</label><input v-model="b.untertitel" class="feld" maxlength="300" /></div>
    <div class="grid gap-3 @3xl:grid-cols-2">
      <div v-for="(e, i) in b.eintraege" :key="i" class="space-y-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
        <div class="flex items-center gap-2">
          <Icon :name="e.icon" klasse="size-5 shrink-0 text-gray-500" />
          <select v-model="e.icon" class="feld w-28 shrink-0">
            <option v-for="(s, name) in SYMBOLE" :key="name" :value="name">{{ s[0] }}</option>
          </select>
          <input v-model="e.titel" class="feld font-semibold" maxlength="120" placeholder="Titel" />
          <button type="button" class="p-1 text-gray-400 hover:text-red-500 disabled:opacity-30" :disabled="b.eintraege.length <= 1" title="Entfernen" @click="b.eintraege.splice(i, 1)">
            <Icon name="muell" klasse="size-4" />
          </button>
        </div>
        <textarea v-model="e.text" rows="2" class="feld text-sm" maxlength="600" placeholder="Kurzer Text" />
        <input v-model="e.link" class="feld font-mono text-xs" maxlength="500" placeholder="Link (optional): /seite/kontakt oder https://…" />
        <select v-model="e.formular_id" class="feld text-xs">
          <option :value="undefined">Kein Formular in der Karte</option>
          <option v-for="f in formulare" :key="f.id" :value="f.id">Formular: {{ f.name }}</option>
        </select>
      </div>
    </div>
    <button v-if="b.eintraege.length < 12" type="button" class="flex items-center gap-1 text-sm font-medium text-violet-500" @click="b.eintraege.push({ icon: 'stern', titel: '', text: '' })">
      <Icon name="plus" klasse="size-4" /> Karte
    </button>
  </div>

  <!-- Neueste Beiträge -->
  <div v-else-if="b.typ === 'beitraege'" class="grid grid-cols-[1fr_7rem_12rem] gap-3 p-5">
    <div><label class="etikett">Überschrift</label><input v-model="b.titel" class="feld" maxlength="200" /></div>
    <div><label class="etikett">Anzahl</label><select v-model.number="b.anzahl" class="feld"><option v-for="n in [3, 6, 9]" :key="n" :value="n">{{ n }}</option></select></div>
    <div>
      <label class="etikett">Kategorie</label>
      <select v-model="b.kategorie" class="feld"><option value="">Alle</option><option v-for="k in kategorien" :key="k.slug" :value="k.slug">{{ k.name }}</option></select>
    </div>
  </div>

  <!-- Formular -->
  <div v-else-if="b.typ === 'formular'" class="space-y-3 p-5">
    <div class="grid grid-cols-[1fr_9rem] gap-3">
      <div>
        <label class="etikett">Formular</label>
        <select v-model="b.formular_id" class="feld">
          <option :value="null" disabled>Bitte wählen …</option>
          <option v-for="f in formulare" :key="f.id" :value="f.id">{{ f.name }} ({{ f.feldzahl }} Felder)</option>
        </select>
      </div>
      <div><label class="etikett">Hintergrund</label><select v-model="b.hintergrund" class="feld"><option v-for="(n, h) in HINTERGRUENDE" :key="h" :value="h">{{ n }}</option></select></div>
    </div>
    <p class="text-xs text-gray-400">
      <RouterLink v-if="b.formular_id" :to="`/admin/formulare/${b.formular_id}`" class="font-medium text-violet-500">Felder dieses Formulars bearbeiten →</RouterLink>
      <template v-if="b.formular_id"> · </template>
      <RouterLink to="/admin/formulare" class="font-medium text-violet-500">Neues Formular anlegen →</RouterLink>
    </p>
    <div><label class="etikett">Überschrift</label><input v-model="b.titel" class="feld" maxlength="200" placeholder="z. B. Schreib uns" /></div>
    <div><label class="etikett">Text über dem Formular</label><textarea v-model="b.text" rows="2" class="feld" maxlength="1000" /></div>
  </div>

  <!-- Icon-Liste -->
  <div v-else-if="b.typ === 'iconliste'" class="space-y-3 p-5">
    <div class="grid grid-cols-[1fr_7rem_9rem] gap-3">
      <div><label class="etikett">Überschrift</label><input v-model="b.titel" class="feld" maxlength="200" /></div>
      <div><label class="etikett">Spalten</label><select v-model.number="b.spalten" class="feld"><option v-for="n in 4" :key="n" :value="n">{{ n }}</option></select></div>
      <div><label class="etikett">Hintergrund</label><select v-model="b.hintergrund" class="feld"><option v-for="(n, h) in HINTERGRUENDE" :key="h" :value="h">{{ n }}</option></select></div>
    </div>
    <div v-for="(e, i) in b.eintraege" :key="i" class="flex items-center gap-2">
      <Icon :name="e.icon" klasse="size-5 shrink-0 text-gray-500" />
      <select v-model="e.icon" class="feld w-40 shrink-0">
        <option v-for="(s, name) in SYMBOLE" :key="name" :value="name">{{ s[0] }}</option>
      </select>
      <input v-model="e.text" class="feld" maxlength="300" />
      <button type="button" class="p-1 text-gray-400 hover:text-red-500 disabled:opacity-30" :disabled="b.eintraege.length <= 1" title="Entfernen" @click="b.eintraege.splice(i, 1)">
        <Icon name="muell" klasse="size-4" />
      </button>
    </div>
    <button v-if="b.eintraege.length < 40" type="button" class="flex items-center gap-1 text-sm font-medium text-violet-500" @click="b.eintraege.push({ icon: 'haken', text: '' })">
      <Icon name="plus" klasse="size-4" /> Eintrag
    </button>
  </div>
</template>
