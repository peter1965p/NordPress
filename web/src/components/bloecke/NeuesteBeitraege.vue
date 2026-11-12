<script setup>
// Block „Neueste Beiträge“: holt die Beiträge beim Anzeigen über die Liefer-API, damit die Seite nie veraltet.
import { ref, watch } from 'vue'
import BeitragsKacheln from './BeitragsKacheln.vue'
import { oeffentlich } from '../../api.js'

const props = defineProps({ b: { type: Object, required: true } })
const items = ref([])
const geladen = ref(false)

watch(() => [props.b.anzahl, props.b.kategorie], async () => {
  const q = new URLSearchParams({ per_page: props.b.anzahl || 3 })
  if (props.b.kategorie) q.set('category', props.b.kategorie)
  try { items.value = (await oeffentlich(`/posts?${q}`)).items } catch { items.value = [] }
  geladen.value = true
}, { immediate: true })
</script>

<template>
  <section class="mx-auto max-w-5xl px-6 py-16">
    <div class="mb-8 flex items-end justify-between gap-4">
      <h2 v-if="b.titel" class="font-titel text-3xl font-bold tracking-tight">{{ b.titel }}</h2>
      <RouterLink to="/blog" class="shrink-0 text-sm font-semibold text-akzent hover:underline">Alle Beiträge →</RouterLink>
    </div>
    <BeitragsKacheln v-if="items.length" :items="items" />
    <p v-else-if="geladen" class="rounded-np border border-dashed border-gray-200 py-10 text-center text-sm text-gray-400 dark:border-gray-700">Noch keine Beiträge veröffentlicht.</p>
  </section>
</template>
