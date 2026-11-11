<script setup>
// Liste der Blöcke: hinzufügen, verschieben (Ziehen am Griff oder Pfeile), duplizieren, löschen, zuklappen.
import { reactive, ref } from 'vue'
import Icon from '../Icon.vue'
import BlockFormular from './BlockFormular.vue'
import { TYPEN, neueId, neuerBlock } from '../../bloecke/typen.js'

const bloecke = defineModel({ type: Array, required: true })
const zu = reactive(new Set())
const auswahl = ref(null)      // Index, hinter dem ein neuer Block eingefügt wird (-1 = ganz oben)
const zieht = ref(null)
const frisch = ref(null)      // ID eines gerade eingefügten Code-Blocks, bekommt den Fokus
const ueber = ref(null)

function einfuegen(typ) {
  const b = neuerBlock(typ)
  bloecke.value.splice(auswahl.value + 1, 0, b)
  auswahl.value = null
}

const ohneText = d => !JSON.stringify(d).includes('"text":')

// Ein Textblock meldet Code (``` + Enter, Knopf oder erkanntes Einfügen): Code-Block dahinter, Rest als neuer Textblock.
function codeEinfuegen(i, { quelle, sprache, rest }) {
  const code = { id: neueId(), typ: 'code', sprache, quelle }
  const neu = [code]
  if (rest?.length && !ohneText({ content: rest })) neu.push({ id: neueId(), typ: 'text', doc: { type: 'doc', content: rest } })
  // War der Textblock danach leer, ersetzt der Code ihn
  const ersetzen = ohneText(bloecke.value[i].doc)
  bloecke.value.splice(ersetzen ? i : i + 1, ersetzen ? 1 : 0, ...neu)
  frisch.value = code.id
}

function verschieben(von, nach) {
  if (nach < 0 || nach >= bloecke.value.length || von === nach) return
  const [b] = bloecke.value.splice(von, 1)
  bloecke.value.splice(nach, 0, b)
}

function duplizieren(i) {
  // JSON statt structuredClone: der Block ist ein reaktiver Proxy
  bloecke.value.splice(i + 1, 0, { ...JSON.parse(JSON.stringify(bloecke.value[i])), id: neueId() })
}

function loeschen(i) {
  if (window.confirm(`Block „${TYPEN[bloecke.value[i].typ].name}“ löschen?`)) bloecke.value.splice(i, 1)
}

function kurz(b) {
  if (b.typ === 'hero') return b.titel
  if (b.typ === 'iconliste') return `${b.titel || ''} · ${b.eintraege.length} Einträge`
  if (b.typ === 'buttons') return b.eintraege.map(k => k.text).join(' · ')
  if (b.typ === 'markdown') return b.quelle.slice(0, 80)
  if (b.typ === 'code') return [b.dateiname, b.quelle.split('\n')[0].slice(0, 60)].filter(Boolean).join(' · ')
  if (b.typ === 'text') return JSON.stringify(b.doc).match(/"text":"([^"]{1,80})/)?.[1] || ''
  return ''
}

function fallen(i) {
  if (zieht.value !== null) verschieben(zieht.value, i)
  zieht.value = ueber.value = null
}
</script>

<template>
  <div class="space-y-3">
    <template v-for="(b, i) in bloecke" :key="b.id">
      <div class="karte @container overflow-hidden transition" :class="[ueber === i && zieht !== i ? 'ring-2 ring-violet-400' : '', zieht === i ? 'opacity-40' : '']"
        @dragover.prevent="ueber = i" @drop.prevent="fallen(i)">
        <header class="flex items-center gap-2 border-b border-gray-100 px-3 py-2 dark:border-gray-700/60">
          <span draggable="true" class="cursor-grab p-1 text-gray-300 hover:text-gray-500 active:cursor-grabbing" title="Ziehen zum Verschieben"
            @dragstart="zieht = i" @dragend="zieht = ueber = null"><Icon name="griff" klasse="size-4" /></span>
          <button type="button" class="flex min-w-0 flex-1 items-center gap-2 text-left" @click="zu.has(b.id) ? zu.delete(b.id) : zu.add(b.id)">
            <Icon :name="TYPEN[b.typ].icon" klasse="size-4 shrink-0 text-violet-500" />
            <span class="text-sm font-semibold text-gray-800 dark:text-gray-100">{{ TYPEN[b.typ].name }}</span>
            <span class="truncate text-xs text-gray-400">{{ kurz(b) }}</span>
          </button>
          <div class="flex shrink-0 items-center text-gray-400">
            <button type="button" class="p-1 hover:text-gray-600 disabled:opacity-30" title="Nach oben" :disabled="i === 0" @click="verschieben(i, i - 1)"><Icon name="hoch" klasse="size-4" /></button>
            <button type="button" class="p-1 hover:text-gray-600 disabled:opacity-30" title="Nach unten" :disabled="i === bloecke.length - 1" @click="verschieben(i, i + 1)"><Icon name="runter" klasse="size-4" /></button>
            <button type="button" class="p-1 hover:text-gray-600" title="Duplizieren" @click="duplizieren(i)"><Icon name="kopie" klasse="size-4" /></button>
            <button type="button" class="p-1 hover:text-red-500" title="Löschen" @click="loeschen(i)"><Icon name="muell" klasse="size-4" /></button>
          </div>
        </header>
        <BlockFormular v-show="!zu.has(b.id)" v-model="bloecke[i]" :neu="frisch === b.id" @als-code="codeEinfuegen(i, $event)" />
      </div>
      <!-- Zwischen den Blöcken einfügen -->
      <div class="group flex h-3 items-center justify-center">
        <button type="button" class="rounded-full bg-violet-500 p-0.5 text-white opacity-0 transition group-hover:opacity-100" title="Block hier einfügen" @click="auswahl = i">
          <Icon name="plus" klasse="size-3.5" />
        </button>
      </div>
    </template>

    <button type="button" class="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-4 text-sm font-medium text-gray-400 hover:border-violet-300 hover:text-violet-500 dark:border-gray-700"
      @click="auswahl = bloecke.length - 1">
      <Icon name="plus" klasse="size-4" /> Block hinzufügen
    </button>

    <!-- Auswahl des Blocktyps -->
    <div v-if="auswahl !== null" class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4" @click.self="auswahl = null">
      <div class="karte w-full max-w-2xl p-5">
        <h2 class="mb-4 font-semibold">Block hinzufügen</h2>
        <div class="grid grid-cols-2 gap-3">
          <button v-for="(t, typ) in TYPEN" :key="typ" type="button"
            class="flex items-start gap-3 rounded-lg border border-gray-200 p-4 text-left hover:border-violet-400 hover:bg-violet-500/5 dark:border-gray-700"
            @click="einfuegen(typ)">
            <Icon :name="t.icon" klasse="size-6 shrink-0 text-violet-500" />
            <span><span class="block text-sm font-semibold text-gray-800 dark:text-gray-100">{{ t.name }}</span><span class="text-xs text-gray-500">{{ t.info }}</span></span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
