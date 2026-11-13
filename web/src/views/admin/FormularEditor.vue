<script setup>
// Formular bearbeiten (Felder, Texte, Vorschau) und Einsendungen lesen.
import { computed, ref, watch } from 'vue'
import Icon from '../../components/Icon.vue'
import FormularFelder from '../../components/bloecke/FormularFelder.vue'
import { admin, datum, melde } from '../../api.js'

const props = defineProps({ id: { type: String, required: true } })

const TYPEN = { text: 'Text (einzeilig)', email: 'E-Mail', telefon: 'Telefon', textarea: 'Text (mehrzeilig)', auswahl: 'Auswahl', checkbox: 'Häkchen' }

const f = ref(null)
const reiter = ref('felder')
const geaendert = ref(false)
const einsendungen = ref([])
const offen = ref(null)
const vorschauWerte = ref({})

// Optionen als Text, eine pro Zeile, damit man sie bequem tippen kann
const optionenText = new WeakMap()

async function laden() {
  f.value = await admin.get(`/forms/${props.id}`)
  for (const x of f.value.felder) { x.breite ||= 'voll'; x.pflicht ||= false }
  geaendert.value = false
  einsendungen.value = (await admin.get(`/forms/${props.id}/einsendungen`)).items
}
watch(() => props.id, laden, { immediate: true })
watch(f, () => { geaendert.value = true }, { deep: true, flush: 'sync' })
watch(() => f.value?.id, () => { geaendert.value = false })

// Feld-ID aus der Beschriftung, eindeutig im Formular
function idAus(label, ausser) {
  const basis = (label || 'feld').toLowerCase().replace(/[äöüß]/g, z => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' })[z])
    .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30) || 'feld'
  const vergeben = new Set(f.value.felder.filter(x => x !== ausser).map(x => x.id))
  let id = basis
  for (let i = 2; vergeben.has(id); i++) id = `${basis}_${i}`
  return id
}

function neuesFeld(typ) {
  const label = TYPEN[typ]
  const feld = { id: '', typ, label, pflicht: false, breite: typ === 'textarea' || typ === 'checkbox' ? 'voll' : 'halb' }
  if (typ === 'auswahl') feld.optionen = ['Option 1', 'Option 2']
  feld.id = idAus(label, feld)
  f.value.felder.push(feld)
}

function typAendern(x) {
  if (x.typ === 'auswahl' && !x.optionen?.length) x.optionen = ['Option 1']
  if (x.typ !== 'auswahl') delete x.optionen
}

const optionen = x => optionenText.get(x) ?? (x.optionen || []).join('\n')
function optionenSetzen(x, text) {
  optionenText.set(x, text)
  x.optionen = text.split('\n').map(o => o.trim()).filter(Boolean).slice(0, 30)
}

function schieben(i, d) {
  const l = f.value.felder
  ;[l[i], l[i + d]] = [l[i + d], l[i]]
}

async function speichern() {
  const { name, felder, absenden_text, erfolg_text, benachrichtigung } = f.value
  const sauber = felder.map(({ platzhalter, optionen: o, ...x }) => ({
    ...x, ...(platzhalter ? { platzhalter } : {}), ...(x.typ === 'auswahl' ? { optionen: o || [] } : {}),
  }))
  try {
    await admin.put(`/forms/${props.id}`, { name, felder: sauber, absenden_text, erfolg_text, benachrichtigung: (benachrichtigung || '').trim() })
    geaendert.value = false
    melde('Gespeichert')
  } catch (e) { melde(e.message, 'fehler') }
}

const ungelesen = computed(() => einsendungen.value.filter(e => !e.gelesen).length)

async function oeffnen(e) {
  offen.value = offen.value === e.id ? null : e.id
  if (!e.gelesen) {
    await admin.put(`/einsendungen/${e.id}`, { gelesen: true })
    e.gelesen = true
  }
}

async function alsUngelesen(e) {
  await admin.put(`/einsendungen/${e.id}`, { gelesen: false })
  e.gelesen = false
  offen.value = null
}

async function einsendungLoeschen(e) {
  if (!confirm('Diese Einsendung löschen?')) return
  await admin.del(`/einsendungen/${e.id}`)
  einsendungen.value = einsendungen.value.filter(x => x.id !== e.id)
}

// Kurzfassung für die Liste: die ersten zwei ausgefüllten Textwerte
const kurz = e => e.daten.filter(d => d.typ !== 'checkbox' && d.wert).slice(0, 2).map(d => d.wert).join(' · ')
const wert = d => (d.typ === 'checkbox' ? (d.wert ? 'Ja' : 'Nein') : d.wert || '–')

// Alle Einsendungen als CSV (Semikolon, mit BOM, damit Excel Umlaute richtig zeigt)
function csv() {
  const spalten = [...new Map(einsendungen.value.flatMap(e => e.daten.map(d => [d.id, d.label]))).entries()]
  const zelle = v => `"${String(v).replaceAll('"', '""')}"`
  const zeilen = [['Datum', ...spalten.map(([, l]) => l)].map(zelle).join(';')]
  for (const e of einsendungen.value) {
    const nach = Object.fromEntries(e.daten.map(d => [d.id, d]))
    zeilen.push([datum(e.created_at, true), ...spalten.map(([id]) => (nach[id] ? wert(nach[id]) : ''))].map(zelle).join(';'))
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob(['﻿' + zeilen.join('\r\n')], { type: 'text/csv;charset=utf-8' }))
  a.download = `${f.value.name.replace(/[^\wäöüÄÖÜß-]+/g, '_')}-einsendungen.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}
</script>

<template>
  <div v-if="f">
    <RouterLink to="/admin/formulare" class="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-violet-500">‹ Alle Formulare</RouterLink>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <input v-model="f.name" class="min-w-0 flex-1 border-0 bg-transparent p-0 text-2xl font-bold text-gray-800 focus:ring-0 focus:outline-none md:text-3xl dark:text-gray-100" maxlength="120" />
      <div class="flex items-center gap-3">
        <span v-if="geaendert" class="text-xs text-amber-500">Nicht gespeichert</span>
        <button class="knopf-akzent" :disabled="!geaendert" @click="speichern">Speichern</button>
      </div>
    </div>

    <div class="mb-6 flex gap-1">
      <button v-for="[r, n] in [['felder', 'Felder'], ['einsendungen', 'Einsendungen']]" :key="r"
        class="rounded-lg px-3 py-1.5 text-sm font-medium" :class="reiter === r ? 'bg-violet-500/10 text-violet-600 dark:text-violet-300' : 'text-gray-500 hover:text-gray-700'"
        @click="reiter = r">
        {{ n }}<span v-if="r === 'einsendungen'" class="ml-1 opacity-70">({{ einsendungen.length }}<template v-if="ungelesen">, {{ ungelesen }} neu</template>)</span>
      </button>
    </div>

    <!-- Felder -->
    <div v-if="reiter === 'felder'" class="grid gap-6 xl:grid-cols-[1fr_26rem]">
      <div class="space-y-3">
        <div v-for="(x, i) in f.felder" :key="i" class="karte space-y-3 p-4">
          <div class="flex items-center gap-2">
            <select v-model="x.typ" class="feld w-44 shrink-0" @change="typAendern(x)">
              <option v-for="(n, t) in TYPEN" :key="t" :value="t">{{ n }}</option>
            </select>
            <input v-model="x.label" class="feld font-medium" maxlength="300" placeholder="Beschriftung" />
            <div class="flex shrink-0">
              <button type="button" class="p-1 text-gray-400 hover:text-violet-500 disabled:opacity-30" :disabled="i === 0" title="Nach oben" @click="schieben(i, -1)"><Icon name="hoch" klasse="size-4" /></button>
              <button type="button" class="p-1 text-gray-400 hover:text-violet-500 disabled:opacity-30" :disabled="i === f.felder.length - 1" title="Nach unten" @click="schieben(i, 1)"><Icon name="runter" klasse="size-4" /></button>
              <button type="button" class="p-1 text-gray-400 hover:text-red-500" title="Entfernen" @click="f.felder.splice(i, 1)"><Icon name="muell" klasse="size-4" /></button>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <label class="flex items-center gap-2"><input v-model="x.pflicht" type="checkbox" class="accent-violet-500" /> Pflichtfeld</label>
            <label v-if="x.typ !== 'checkbox'" class="flex items-center gap-2">
              Breite
              <select v-model="x.breite" class="feld w-auto py-1"><option value="voll">Ganze Zeile</option><option value="halb">Halbe Zeile</option></select>
            </label>
            <input v-if="!['checkbox'].includes(x.typ)" v-model="x.platzhalter" class="feld min-w-40 flex-1 py-1" maxlength="200"
              :placeholder="x.typ === 'auswahl' ? 'Text vor der Auswahl (optional)' : 'Platzhalter (optional)'" />
          </div>
          <div v-if="x.typ === 'auswahl'">
            <label class="etikett text-xs">Optionen, eine pro Zeile</label>
            <textarea :value="optionen(x)" rows="3" class="feld text-sm" @input="optionenSetzen(x, $event.target.value)" />
          </div>
          <p v-if="x.typ === 'checkbox'" class="text-xs text-gray-400">Link in der Beschriftung: [Datenschutzerklärung](/seite/datenschutz)</p>
        </div>

        <div class="karte p-4">
          <p class="mb-2 text-sm font-medium text-gray-800 dark:text-gray-100">Feld hinzufügen</p>
          <div class="flex flex-wrap gap-2">
            <button v-for="(n, t) in TYPEN" :key="t" type="button" class="knopf-rand py-1.5" :disabled="f.felder.length >= 30" @click="neuesFeld(t)">
              <Icon name="plus" klasse="size-3.5" /> {{ n }}
            </button>
          </div>
        </div>

        <div class="karte grid gap-4 p-4 sm:grid-cols-[14rem_1fr]">
          <div><label class="etikett">Text des Buttons</label><input v-model="f.absenden_text" class="feld" maxlength="60" /></div>
          <div><label class="etikett">Meldung nach dem Absenden</label><textarea v-model="f.erfolg_text" rows="2" class="feld" maxlength="500" /></div>
          <div class="sm:col-span-2">
            <label class="etikett">Bei neuer Einsendung E-Mail an</label>
            <input v-model="f.benachrichtigung" class="feld" maxlength="500" placeholder="name@firma.de, zweite@firma.de (leer: keine Mail)" />
            <p v-if="!f.mail_aktiv" class="mt-1 text-xs text-amber-500">Auf dem Server ist noch kein Absender eingerichtet (MAIL_FROM), es werden noch keine Mails verschickt.</p>
            <p v-else class="mt-1 text-xs text-gray-400">Antworten auf die Mail gehen direkt an die E-Mail-Adresse aus dem Formular.</p>
          </div>
        </div>
      </div>

      <div class="karte @container h-fit p-6 xl:sticky xl:top-24">
        <p class="mb-4 text-xs font-semibold tracking-wide text-gray-400 uppercase">Vorschau</p>
        <FormularFelder v-model="vorschauWerte" :felder="f.felder" class="text-gray-800 dark:text-gray-100" />
        <button type="button" disabled class="mt-6 rounded-knopf bg-akzent px-6 py-3 text-sm font-semibold text-akzent-text opacity-90">{{ f.absenden_text }}</button>
      </div>
    </div>

    <!-- Einsendungen -->
    <div v-else>
      <div v-if="einsendungen.length" class="mb-3 flex justify-end">
        <button class="knopf-rand" @click="csv"><Icon name="runter" klasse="size-4" /> Als CSV herunterladen</button>
      </div>
      <div class="karte divide-y divide-gray-100 dark:divide-gray-700/60">
        <div v-for="e in einsendungen" :key="e.id">
          <button class="flex w-full items-center gap-4 px-5 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/20" @click="oeffnen(e)">
            <span class="size-2 shrink-0 rounded-full" :class="e.gelesen ? 'bg-transparent' : 'bg-violet-500'" />
            <span class="w-36 shrink-0 text-sm">{{ datum(e.created_at, true) }}</span>
            <span class="truncate text-sm" :class="e.gelesen ? '' : 'font-semibold text-gray-800 dark:text-gray-100'">{{ kurz(e) || '–' }}</span>
          </button>
          <div v-if="offen === e.id" class="bg-gray-50 px-5 py-4 dark:bg-gray-900/20">
            <dl class="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[12rem_1fr]">
              <template v-for="d in e.daten" :key="d.id">
                <dt class="font-medium text-gray-500">{{ d.label.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') }}</dt>
                <dd class="break-words whitespace-pre-line text-gray-800 dark:text-gray-100">
                  <a v-if="d.typ === 'email' && d.wert" :href="`mailto:${d.wert}`" class="text-violet-500">{{ d.wert }}</a>
                  <a v-else-if="d.typ === 'telefon' && d.wert" :href="`tel:${d.wert.replace(/[^+0-9]/g, '')}`" class="text-violet-500">{{ d.wert }}</a>
                  <template v-else>{{ wert(d) }}</template>
                </dd>
              </template>
            </dl>
            <div class="mt-4 flex gap-2">
              <button class="knopf-rand py-1.5" @click="alsUngelesen(e)">Als ungelesen markieren</button>
              <button class="knopf-gefahr py-1.5" @click="einsendungLoeschen(e)"><Icon name="muell" klasse="size-4" /> Löschen</button>
            </div>
          </div>
        </div>
        <p v-if="!einsendungen.length" class="py-10 text-center text-sm text-gray-400">Noch keine Einsendungen.</p>
      </div>
    </div>
  </div>
</template>
