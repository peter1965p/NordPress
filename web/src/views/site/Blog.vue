<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import BeitragsKacheln from '../../components/bloecke/BeitragsKacheln.vue'
import { oeffentlich } from '../../api.js'

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
  <div class="@container"><BeitragsKacheln :items="daten.items" /></div>
  <p v-if="!daten.items.length" class="py-20 text-center text-gray-400">Hier ist noch nichts veröffentlicht.</p>
  <div v-if="daten.total > daten.per_page" class="mt-12 flex justify-center gap-3">
    <button class="knopf-rand" :disabled="nummer <= 1" @click="nummer--">← Neuer</button>
    <button class="knopf-rand" :disabled="nummer * daten.per_page >= daten.total" @click="nummer++">Älter →</button>
  </div>
</template>
