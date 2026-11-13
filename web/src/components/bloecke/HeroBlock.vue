<script setup>
import Knoepfe from './Knoepfe.vue'
import NordDeko from './NordDeko.vue'

// titel_html kommt bereinigt von der API (nur <em> und <strong>), in der Vorschau aus DOMPurify.
import { computed } from 'vue'
const props = defineProps({ b: { type: Object, required: true } })
const nord = computed(() => !props.b.bild && props.b.deko === 'norden')
</script>

<template>
  <!-- Variante „logo“: Bild vollständig (nicht beschnitten) oben, Text darunter. Für Logos und Grafiken -->
  <section v-if="b.variante === 'logo'" class="py-14 @3xl:py-20" :class="b.ausrichtung === 'mitte' ? 'text-center' : ''">
    <div class="mx-auto max-w-4xl px-6">
      <img v-if="b.bild" :src="b.bild.url" :alt="b.bild.alt" class="mb-10 h-auto max-h-40 w-auto max-w-full rounded-np object-contain @3xl:max-h-56" :class="b.ausrichtung === 'mitte' ? 'mx-auto' : ''" />
      <p v-if="b.eyebrow" class="mb-3 text-xs font-semibold tracking-widest text-akzent uppercase">{{ b.eyebrow }}</p>
      <h1 class="font-titel text-3xl leading-tight font-bold tracking-tight text-gray-900 @3xl:text-5xl dark:text-white [&_em]:text-akzent [&_em]:italic" v-html="b.titel_html" />
      <p v-if="b.untertitel" class="mt-4 text-xl text-gray-700 dark:text-gray-300">{{ b.untertitel }}</p>
      <p v-if="b.text" class="mt-4 max-w-2xl text-lg leading-relaxed text-gray-600 dark:text-gray-400" :class="b.ausrichtung === 'mitte' ? 'mx-auto' : ''">{{ b.text }}</p>
      <Knoepfe v-if="b.buttons?.length" :eintraege="b.buttons" class="mt-8" :class="b.ausrichtung === 'mitte' ? 'justify-center' : ''" />
      <p v-if="b.hinweis" class="mt-4 text-sm text-gray-500">{{ b.hinweis }}</p>
    </div>
  </section>

  <!-- Variante „hintergrund“: Bild über die ganze Breite, Text darüber -->
  <section v-else-if="b.variante !== 'geteilt'" class="relative isolate flex min-h-[24rem] items-center overflow-hidden bg-gray-900 @3xl:min-h-[34rem]">
    <img v-if="b.bild" :src="b.bild.url" :alt="b.bild.alt" class="absolute inset-0 -z-10 size-full object-cover" />
    <!-- Ohne Bild: Verlauf in der Akzentfarbe mit feinem Raster -->
    <template v-else>
      <div class="absolute inset-0 -z-10 bg-gray-950" />
      <div class="absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_20%_10%,color-mix(in_oklab,var(--color-akzent)_55%,transparent),transparent),radial-gradient(50%_60%_at_90%_90%,color-mix(in_oklab,var(--color-akzent)_30%,transparent),transparent)]" />
      <div class="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgb(255_255_255/0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.05)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      <NordDeko v-if="b.deko === 'norden'" />
    </template>
    <div class="absolute inset-0 -z-10 bg-black" :style="{ opacity: (b.bild ? b.abdunkeln : 0) / 100 }" />
    <div class="mx-auto w-full max-w-5xl px-6 py-16 text-white" :class="[b.ausrichtung === 'mitte' ? 'text-center' : '', nord ? 'pb-32 @3xl:pr-[32%]' : '']">
      <p v-if="b.eyebrow" class="mb-3 text-xs font-semibold tracking-widest uppercase opacity-80">{{ b.eyebrow }}</p>
      <h1 class="font-titel text-3xl leading-tight font-semibold text-white drop-shadow @3xl:text-5xl [&_em]:italic" v-html="b.titel_html" />
      <p v-if="b.untertitel" class="mt-3 text-lg opacity-90 @3xl:text-xl">{{ b.untertitel }}</p>
      <p v-if="b.text" class="mt-5 max-w-2xl text-base opacity-90" :class="b.ausrichtung === 'mitte' ? 'mx-auto' : ''">{{ b.text }}</p>
      <Knoepfe v-if="b.buttons?.length" :eintraege="b.buttons" dunkel class="mt-8" :class="b.ausrichtung === 'mitte' ? 'justify-center' : ''" />
      <p v-if="b.hinweis" class="mt-4 text-xs opacity-70">{{ b.hinweis }}</p>
    </div>
  </section>

  <!-- Variante „geteilt“: Text links, Bild rechts -->
  <section v-else class="mx-auto grid max-w-5xl items-center gap-12 px-6 py-16 @3xl:grid-cols-2 @3xl:py-24">
    <div>
      <p v-if="b.eyebrow" class="mb-5 flex items-center gap-2 text-xs font-semibold tracking-widest text-akzent uppercase">
        <span class="size-2 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />{{ b.eyebrow }}
      </p>
      <h1 class="font-titel text-4xl leading-[1.05] tracking-tight text-gray-900 @3xl:text-6xl dark:text-white [&_em]:text-akzent [&_em]:italic" v-html="b.titel_html" />
      <p v-if="b.untertitel" class="mt-5 text-xl text-gray-700 dark:text-gray-300">{{ b.untertitel }}</p>
      <p v-if="b.text" class="mt-5 text-lg leading-relaxed text-gray-600 dark:text-gray-400">{{ b.text }}</p>
      <Knoepfe v-if="b.buttons?.length" :eintraege="b.buttons" class="mt-8" />
      <p v-if="b.hinweis" class="mt-5 text-sm text-gray-500">{{ b.hinweis }}</p>
    </div>
    <img v-if="b.bild" :src="b.bild.url" :alt="b.bild.alt" class="w-full rotate-1 rounded-np shadow-2xl" />
  </section>
</template>
