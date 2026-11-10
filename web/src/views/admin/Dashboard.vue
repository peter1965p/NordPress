<script setup>
import { onMounted, ref } from 'vue'
import Icon from '../../components/Icon.vue'
import { admin, darf, datum, sitzung } from '../../api.js'

const zahlen = ref([])
const neueste = ref([])

onMounted(async () => {
  const [veroeff, entwuerfe, medien, kats] = await Promise.all([
    admin.get('/posts?type=post&status=published'),
    admin.get('/posts?type=post&status=draft'),
    admin.get('/media'),
    admin.get('/terms?taxonomy=category'),
  ])
  const seiten = darf('editor') ? await admin.get('/posts?type=page') : null
  zahlen.value = [
    { titel: 'Veröffentlicht', wert: veroeff.total, icon: 'beitrag', farbe: 'text-violet-500 bg-violet-500/10' },
    { titel: 'Entwürfe', wert: entwuerfe.total, icon: 'stift', farbe: 'text-amber-500 bg-amber-500/10' },
    seiten && { titel: 'Seiten', wert: seiten.total, icon: 'seite', farbe: 'text-sky-500 bg-sky-500/10' },
    { titel: 'Medien', wert: medien.items.length, icon: 'medien', farbe: 'text-green-500 bg-green-500/10' },
    { titel: 'Kategorien', wert: kats.items.length, icon: 'kategorie', farbe: 'text-rose-500 bg-rose-500/10' },
  ].filter(Boolean)
  neueste.value = [...veroeff.items, ...entwuerfe.items]
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 6)
})
</script>

<template>
  <div class="mb-8 sm:flex sm:items-center sm:justify-between">
    <h1 class="text-2xl font-bold md:text-3xl">Moin, {{ sitzung.benutzer?.name?.split(' ')[0] }} 👋</h1>
    <RouterLink to="/admin/beitraege/neu" class="knopf-haupt mt-4 sm:mt-0"><Icon name="plus" klasse="size-4" /> Neuer Beitrag</RouterLink>
  </div>

  <div class="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
    <div v-for="z in zahlen" :key="z.titel" class="karte p-5">
      <div class="mb-3 flex size-9 items-center justify-center rounded-lg" :class="z.farbe"><Icon :name="z.icon" klasse="size-5" /></div>
      <div class="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">{{ z.titel }}</div>
      <div class="mt-1 text-3xl font-bold text-gray-800 dark:text-gray-100">{{ z.wert }}</div>
    </div>
  </div>

  <div class="mt-6 grid gap-6 xl:grid-cols-3">
    <div class="karte xl:col-span-2">
      <header class="border-b border-gray-100 px-5 py-4 dark:border-gray-700/60">
        <h2 class="font-semibold">Zuletzt bearbeitet</h2>
      </header>
      <ul class="divide-y divide-gray-100 dark:divide-gray-700/60">
        <li v-for="b in neueste" :key="b.id" class="flex items-center justify-between gap-4 px-5 py-3">
          <RouterLink :to="`/admin/beitraege/${b.id}`" class="truncate font-medium text-gray-800 hover:text-violet-500 dark:text-gray-100">{{ b.title }}</RouterLink>
          <div class="flex shrink-0 items-center gap-3 text-sm">
            <span class="marke" :class="b.status === 'published' ? 'bg-green-500/15 text-green-700 dark:text-green-400' : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'">
              {{ b.status === 'published' ? 'Online' : 'Entwurf' }}
            </span>
            <span class="hidden text-gray-400 sm:inline">{{ datum(b.updated_at, true) }}</span>
          </div>
        </li>
        <li v-if="!neueste.length" class="px-5 py-8 text-center text-sm text-gray-400">Noch nichts geschrieben. Zeit für den ersten Beitrag.</li>
      </ul>
    </div>
    <div class="karte p-5">
      <h2 class="mb-3 font-semibold">Headless-API</h2>
      <p class="mb-4 text-sm">Jedes Frontend kann die Inhalte lesen, ganz ohne Anmeldung, nur Veröffentlichtes:</p>
      <ul class="space-y-2 font-mono text-xs">
        <li v-for="p in ['/api/v1/posts', '/api/v1/posts/:slug', '/api/v1/pages', '/api/v1/categories', '/api/v1/settings']" :key="p">
          <a :href="p.includes(':') ? undefined : p" target="_blank" class="block rounded-md bg-gray-100 px-2 py-1.5 text-gray-700 hover:text-violet-500 dark:bg-gray-900/40 dark:text-gray-300">GET {{ p }}</a>
        </li>
      </ul>
    </div>
  </div>
</template>
