<script setup>
import Icon from '../Icon.vue'
import FormularEinbettung from './FormularEinbettung.vue'
import { FLAECHE, istDunkel } from './flaeche.js'

defineProps({ b: { type: Object, required: true } })
const SPALTEN = { 2: '@2xl:grid-cols-2', 3: '@2xl:grid-cols-2 @4xl:grid-cols-3', 4: '@2xl:grid-cols-2 @4xl:grid-cols-4' }
const intern = l => l?.startsWith('/')
// Eine Karte mit Formular ist kein Link (Formular in einem Link geht nicht), der Link steht dann darunter
const alsLink = e => e.link && !e.formular_id
// Auf eigenen Flächen erbt der Text die Farbe der Fläche, sonst feste Grautöne für guten Kontrast
const eigeneFlaeche = h => istDunkel(h) || h === 'sand'
</script>

<template>
  <section class="py-20" :class="FLAECHE[b.hintergrund]">
    <div class="mx-auto max-w-5xl px-6">
      <div v-if="b.titel || b.untertitel" class="mb-12 max-w-2xl">
        <h2 v-if="b.titel" class="font-titel text-3xl font-bold tracking-tight @3xl:text-4xl">{{ b.titel }}</h2>
        <p v-if="b.untertitel" class="mt-3 text-lg" :class="eigeneFlaeche(b.hintergrund) ? 'opacity-80' : 'text-gray-600 dark:text-gray-400'">{{ b.untertitel }}</p>
      </div>
      <div class="grid gap-5" :class="SPALTEN[b.spalten]">
        <component :is="alsLink(e) ? (intern(e.link) ? 'RouterLink' : 'a') : 'div'" v-for="(e, i) in b.eintraege" :key="i"
          v-bind="alsLink(e) ? (intern(e.link) ? { to: e.link } : { href: e.link }) : {}"
          class="group relative flex flex-col rounded-np p-6 transition"
          :class="[
            istDunkel(b.hintergrund) || b.hintergrund === 'sand' ? 'bg-white/10 ring-1 ring-current/10' : 'bg-white shadow-sm ring-1 ring-gray-900/5 dark:bg-gray-800/60 dark:ring-white/10',
            alsLink(e) ? 'hover:-translate-y-1 hover:shadow-lg' : '',
            e.formular_id && b.spalten > 2 ? '@4xl:col-span-2' : '',
          ]">
          <span class="mb-5 inline-flex size-11 items-center justify-center rounded-np"
            :class="istDunkel(b.hintergrund) ? 'bg-white/15' : 'bg-akzent/10 text-akzent'">
            <Icon :name="e.icon" klasse="size-5" />
          </span>
          <h3 class="font-titel text-lg font-semibold" :class="istDunkel(b.hintergrund) || b.hintergrund === 'sand' ? '' : 'text-gray-900 dark:text-white'">{{ e.titel }}</h3>
          <p v-if="e.text" class="mt-2 text-sm leading-relaxed" :class="eigeneFlaeche(b.hintergrund) ? 'opacity-80' : 'text-gray-600 dark:text-gray-400'">{{ e.text }}</p>
          <FormularEinbettung v-if="e.formular_id" :formular-id="e.formular_id" class="mt-6" />
          <a v-if="e.link && e.formular_id" :href="e.link" class="mt-4 text-sm font-semibold" :class="istDunkel(b.hintergrund) ? '' : 'text-akzent'">Mehr erfahren →</a>
          <span v-else-if="e.link" class="mt-4 text-sm font-semibold" :class="istDunkel(b.hintergrund) ? '' : 'text-akzent'">Mehr erfahren <span class="inline-block transition group-hover:translate-x-1">→</span></span>
        </component>
      </div>
    </div>
  </section>
</template>
