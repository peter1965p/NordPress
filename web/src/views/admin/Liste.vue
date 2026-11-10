<script setup>
import { computed, ref, watch } from 'vue'
import Icon from '../../components/Icon.vue'
import { admin, datum, melde } from '../../api.js'

const props = defineProps({ typ: { type: String, required: true } })
const seite = computed(() => props.typ === 'page')
const basis = computed(() => (seite.value ? '/admin/seiten' : '/admin/beitraege'))

const filter = ref('')
const suche = ref('')
const nummer = ref(1)
const daten = ref({ items: [], total: 0, per_page: 20 })
const laedt = ref(true)

async function laden() {
  laedt.value = true
  const q = new URLSearchParams({ type: props.typ, page: nummer.value })
  if (filter.value) q.set('status', filter.value)
  if (suche.value.trim()) q.set('search', suche.value.trim())
  daten.value = await admin.get(`/posts?${q}`)
  laedt.value = false
}

let warte
watch(suche, () => { clearTimeout(warte); warte = setTimeout(() => { nummer.value = 1; laden() }, 250) })
watch([filter, () => props.typ], () => { nummer.value = 1; laden() })
watch(nummer, laden)
laden()

const seiten = computed(() => Math.max(1, Math.ceil(daten.value.total / daten.value.per_page)))

async function loeschen(b) {
  if (!confirm(`„${b.title}“ wirklich löschen?`)) return
  await admin.del(`/posts/${b.id}`)
  melde('Gelöscht')
  laden()
}
</script>

<template>
  <div class="mb-8 sm:flex sm:items-center sm:justify-between">
    <h1 class="text-2xl font-bold md:text-3xl">{{ seite ? 'Seiten' : 'Beiträge' }}</h1>
    <RouterLink :to="`${basis}/neu`" class="knopf-haupt mt-4 sm:mt-0"><Icon name="plus" klasse="size-4" /> {{ seite ? 'Neue Seite' : 'Neuer Beitrag' }}</RouterLink>
  </div>

  <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
    <ul class="flex flex-wrap gap-2">
      <li v-for="f in [['', 'Alle'], ['published', 'Online'], ['draft', 'Entwürfe']]" :key="f[0]">
        <button class="rounded-full border px-3 py-1 text-sm font-medium shadow-sm transition"
          :class="filter === f[0]
            ? 'border-transparent bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-800'
            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 dark:border-gray-700/60 dark:bg-gray-800 dark:text-gray-400'"
          @click="filter = f[0]">{{ f[1] }}</button>
      </li>
    </ul>
    <label class="relative">
      <Icon name="suche" klasse="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" />
      <input v-model="suche" class="feld w-64 pl-9" placeholder="Titel suchen …" />
    </label>
  </div>

  <div class="karte overflow-x-auto">
    <header class="px-5 py-4">
      <h2 class="font-semibold">{{ seite ? 'Alle Seiten' : 'Alle Beiträge' }} <span class="font-medium text-gray-400">{{ daten.total }}</span></h2>
    </header>
    <table class="tabelle w-full">
      <thead>
        <tr><th>Titel</th><th>Status</th><th class="hidden md:table-cell">{{ seite ? 'Reihenfolge' : 'Kategorien' }}</th><th class="hidden lg:table-cell">Autor</th><th class="hidden sm:table-cell">Geändert</th><th class="w-24" /></tr>
      </thead>
      <tbody>
        <tr v-for="b in daten.items" :key="b.id" class="hover:bg-gray-50/60 dark:hover:bg-gray-900/10">
          <td>
            <RouterLink :to="`${basis}/${b.id}`" class="font-medium text-gray-800 hover:text-violet-500 dark:text-gray-100">{{ b.title }}</RouterLink>
            <div class="font-mono text-xs text-gray-400">/{{ b.slug }}</div>
          </td>
          <td>
            <span class="marke" :class="b.status === 'published' ? 'bg-green-500/15 text-green-700 dark:text-green-400' : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'">
              {{ b.status === 'published' ? 'Online' : 'Entwurf' }}
            </span>
          </td>
          <td class="hidden md:table-cell">
            <template v-if="seite">{{ b.menu_order }}</template>
            <div v-else class="flex flex-wrap gap-1">
              <span v-for="t in b.terms.filter(t => t.taxonomy === 'category')" :key="t.id" class="marke bg-violet-500/10 text-violet-600 dark:text-violet-400">{{ t.name }}</span>
            </div>
          </td>
          <td class="hidden lg:table-cell">{{ b.author_name || '–' }}</td>
          <td class="hidden whitespace-nowrap sm:table-cell">{{ datum(b.updated_at, true) }}</td>
          <td>
            <div class="flex justify-end gap-1">
              <a v-if="b.status === 'published'" :href="`/${seite ? 'seite' : 'beitrag'}/${b.slug}`" target="_blank" class="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-700/50" title="Ansehen"><Icon name="auge" klasse="size-4" /></a>
              <button class="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-700/50" title="Löschen" @click="loeschen(b)"><Icon name="muell" klasse="size-4" /></button>
            </div>
          </td>
        </tr>
        <tr v-if="!laedt && !daten.items.length"><td colspan="6" class="py-10 text-center text-gray-400">Nichts gefunden.</td></tr>
      </tbody>
    </table>
  </div>

  <div v-if="seiten > 1" class="mt-6 flex items-center justify-between text-sm">
    <span>Seite {{ nummer }} von {{ seiten }}</span>
    <div class="flex gap-2">
      <button class="knopf-rand" :disabled="nummer <= 1" @click="nummer--">← Zurück</button>
      <button class="knopf-rand" :disabled="nummer >= seiten" @click="nummer++">Weiter →</button>
    </div>
  </div>
</template>
