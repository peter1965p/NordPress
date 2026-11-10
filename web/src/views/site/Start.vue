<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { datum, oeffentlich } from '../../api.js'

const route = useRoute()
const daten = ref({ items: [], total: 0, page: 1, per_page: 9 })
const nummer = ref(1)

async function laden() {
  const q = new URLSearchParams({ page: nummer.value, per_page: 9 })
  if (route.params.kategorie) q.set('category', route.params.kategorie)
  daten.value = await oeffentlich(`/posts?${q}`)
}
watch(() => route.params.kategorie, () => { nummer.value = 1; laden() })
watch(nummer, laden)
laden()
</script>

<template>
  <div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
    <article v-for="b in daten.items" :key="b.id" class="group flex flex-col">
      <RouterLink :to="`/beitrag/${b.slug}`" class="mb-4 block overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
        <img v-if="b.featured_media" :src="b.featured_media.url" :alt="b.featured_media.alt" class="aspect-[16/10] w-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" />
        <div v-else class="aspect-[16/10] w-full bg-[radial-gradient(circle_at_30%_30%,rgba(132,112,255,.35),transparent_60%)]" />
      </RouterLink>
      <div class="mb-2 flex flex-wrap gap-2 text-xs">
        <span v-for="k in b.categories" :key="k.slug" class="font-semibold text-violet-500 uppercase">{{ k.name }}</span>
      </div>
      <h2 class="mb-2 text-lg leading-snug font-bold">
        <RouterLink :to="`/beitrag/${b.slug}`" class="hover:text-violet-500">{{ b.title }}</RouterLink>
      </h2>
      <p class="mb-3 line-clamp-3 grow text-sm text-gray-600 dark:text-gray-400">{{ b.excerpt }}</p>
      <div class="text-xs text-gray-400">{{ datum(b.published_at) }}<template v-if="b.author"> · {{ b.author.name }}</template></div>
    </article>
  </div>
  <p v-if="!daten.items.length" class="py-20 text-center text-gray-400">Hier ist noch nichts veröffentlicht.</p>
  <div v-if="daten.total > daten.per_page" class="mt-12 flex justify-center gap-3">
    <button class="knopf-rand" :disabled="nummer <= 1" @click="nummer--">← Neuer</button>
    <button class="knopf-rand" :disabled="nummer * daten.per_page >= daten.total" @click="nummer++">Älter →</button>
  </div>
</template>
