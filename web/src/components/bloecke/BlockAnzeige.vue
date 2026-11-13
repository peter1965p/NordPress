<script setup>
// Zeigt die Blöcke, wie die Liefer-API sie ausgibt. Wird auf der Website und in der Live-Vorschau des Editors benutzt.
// Breakpoints sind Container-Abfragen (@3xl), damit die Vorschau in einer schmalen Spalte wie ein schmaler Bildschirm aussieht.
import Icon from '../Icon.vue'
import HeroBlock from './HeroBlock.vue'
import Knoepfe from './Knoepfe.vue'
import CodeBlock from './CodeBlock.vue'
import KartenBlock from './KartenBlock.vue'
import NeuesteBeitraege from './NeuesteBeitraege.vue'
import FormularBlock from './FormularBlock.vue'
import { FLAECHE, istDunkel } from './flaeche.js'
import { istLeer } from '../../bloecke/typen.js'
import { computed } from 'vue'

const props = defineProps({ bloecke: { type: Array, default: () => [] } })
const sichtbar = computed(() => props.bloecke.filter(b => !istLeer(b)))
const SPALTEN = { 1: '', 2: '@2xl:grid-cols-2', 3: '@2xl:grid-cols-2 @4xl:grid-cols-3', 4: '@2xl:grid-cols-2 @4xl:grid-cols-4' }
</script>

<template>
  <div class="@container">
    <template v-for="b in sichtbar" :key="b.id">
      <HeroBlock v-if="b.typ === 'hero'" :b="b" />

      <section v-else-if="b.typ === 'buttons'" class="py-6" :class="FLAECHE[b.hintergrund]">
        <Knoepfe :eintraege="b.eintraege" :dunkel="istDunkel(b.hintergrund)" class="mx-auto max-w-5xl px-6" :class="b.ausrichtung === 'mitte' ? 'justify-center' : ''" />
      </section>

      <section v-else-if="b.typ === 'iconliste'" class="py-14" :class="FLAECHE[b.hintergrund]">
        <div class="mx-auto max-w-4xl px-6">
          <h2 v-if="b.titel" class="mb-8 font-titel text-2xl font-medium tracking-wide uppercase" :class="istDunkel(b.hintergrund) || b.hintergrund === 'sand' ? '!text-current' : ''">{{ b.titel }}</h2>
          <ul class="grid gap-x-12 gap-y-4" :class="SPALTEN[b.spalten]">
            <li v-for="(e, i) in b.eintraege" :key="i" class="flex items-center gap-4 text-lg">
              <Icon :name="e.icon" klasse="size-6 shrink-0" />{{ e.text }}
            </li>
          </ul>
        </div>
      </section>

      <KartenBlock v-else-if="b.typ === 'karten'" :b="b" />

      <NeuesteBeitraege v-else-if="b.typ === 'beitraege'" :b="b" />

      <CodeBlock v-else-if="b.typ === 'code'" :b="b" />

      <FormularBlock v-else-if="b.typ === 'formular'" :b="b" />

      <div v-else-if="b.html !== undefined" class="mx-auto max-w-3xl px-6 py-8">
        <div class="prose prose-gray max-w-none dark:prose-invert prose-a:text-akzent prose-headings:font-titel prose-img:rounded-np" v-html="b.html" />
      </div>
    </template>
  </div>
</template>
