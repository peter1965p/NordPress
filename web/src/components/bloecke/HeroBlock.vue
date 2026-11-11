<script setup>
import Knoepfe from './Knoepfe.vue'

// titel_html kommt bereinigt von der API (nur <em> und <strong>), in der Vorschau aus DOMPurify.
defineProps({ b: { type: Object, required: true } })
</script>

<template>
  <!-- Variante „hintergrund“: Bild über die ganze Breite, Text darüber -->
  <section v-if="b.variante !== 'geteilt'" class="relative isolate flex min-h-[24rem] items-center overflow-hidden bg-gray-900 @3xl:min-h-[34rem]">
    <img v-if="b.bild" :src="b.bild.url" :alt="b.bild.alt" class="absolute inset-0 -z-10 size-full object-cover" />
    <div class="absolute inset-0 -z-10 bg-black" :style="{ opacity: (b.bild ? b.abdunkeln : 0) / 100 }" />
    <div class="mx-auto w-full max-w-5xl px-6 py-16 text-white" :class="b.ausrichtung === 'mitte' ? 'text-center' : ''">
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
