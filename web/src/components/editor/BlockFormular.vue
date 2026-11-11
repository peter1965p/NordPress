<script setup>
// Eingabefelder je Blocktyp. Feldnamen und Grenzen wie im Schema der API (api/src/lib/bloecke.js).
import { defineAsyncComponent, inject, ref } from 'vue'
import Icon from '../Icon.vue'
import MedienWahl from '../MedienWahl.vue'
import KnopfListe from './KnopfListe.vue'
import TextEditor from './TextEditor.vue'
import { SYMBOLE } from '../symbole.js'
import { HINTERGRUENDE, SPRACHEN } from '../../bloecke/typen.js'

// Monaco erst laden, wenn ein Code-Block sichtbar wird
const CodeEditor = defineAsyncComponent(() => import('./CodeEditor.vue'))
defineEmits(['als-code'])
defineProps({ neu: Boolean })

const b = defineModel({ type: Object, required: true })
const bilder = inject('bilder')
const waehlen = ref(false)

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
        <button v-for="[v, n] in [['hintergrund', 'Bild im Hintergrund'], ['geteilt', 'Text links, Bild rechts']]" :key="v" type="button"
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
      </div>
      <div>
        <label class="etikett">Ausrichtung</label>
        <select v-model="b.ausrichtung" class="feld"><option value="mitte">Mittig</option><option value="links">Links</option></select>
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
