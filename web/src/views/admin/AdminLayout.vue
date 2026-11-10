<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from '../../components/Icon.vue'
import { admin, darf, sitzung, ROLLEN } from '../../api.js'

const route = useRoute()
const router = useRouter()
const offen = ref(false)
const menue = ref(false)
const dunkel = ref(document.documentElement.classList.contains('dark'))

watch(() => route.fullPath, () => { offen.value = false; menue.value = false })

function umschalten() {
  dunkel.value = !dunkel.value
  document.documentElement.classList.toggle('dark', dunkel.value)
  try { localStorage.setItem('np-theme', dunkel.value ? 'dark' : 'light') } catch {}
}

async function abmelden() {
  await admin.post('/logout')
  sitzung.benutzer = null
  router.push('/admin/login')
}

const gruppen = computed(() => [
  {
    titel: 'Inhalte',
    eintraege: [
      { name: 'Dashboard', ziel: '/admin', icon: 'dashboard', genau: true },
      { name: 'Beiträge', ziel: '/admin/beitraege', icon: 'beitrag' },
      darf('editor') && { name: 'Seiten', ziel: '/admin/seiten', icon: 'seite' },
      { name: 'Mediathek', ziel: '/admin/medien', icon: 'medien' },
    ].filter(Boolean),
  },
  {
    titel: 'Ordnung',
    eintraege: [
      { name: 'Kategorien', ziel: '/admin/kategorien', icon: 'kategorie' },
      { name: 'Schlagwörter', ziel: '/admin/schlagwoerter', icon: 'tag' },
    ],
  },
  darf('admin') && {
    titel: 'Verwaltung',
    eintraege: [
      { name: 'Benutzer', ziel: '/admin/benutzer', icon: 'benutzer' },
      { name: 'Einstellungen', ziel: '/admin/einstellungen', icon: 'einstellungen' },
    ],
  },
].filter(Boolean))

const aktiv = e => (e.genau ? route.path === e.ziel : route.path.startsWith(e.ziel))
const initialen = computed(() => (sitzung.benutzer?.name || '?').split(/\s+/).map(t => t[0]).slice(0, 2).join('').toUpperCase())
</script>

<template>
  <div class="flex h-dvh overflow-hidden">
    <!-- Hintergrund für mobile Seitenleiste -->
    <div class="fixed inset-0 z-40 bg-gray-900/40 transition-opacity lg:hidden" :class="offen ? 'opacity-100' : 'pointer-events-none opacity-0'" @click="offen = false" />

    <!-- Seitenleiste -->
    <aside class="fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col overflow-y-auto bg-gray-900 p-4 transition-transform duration-200 lg:static lg:translate-x-0"
      :class="offen ? 'translate-x-0' : '-translate-x-64'">
      <div class="mb-10 flex items-center justify-between pr-3 sm:px-2">
        <RouterLink to="/admin" class="flex items-center gap-3">
          <img src="/favicon.svg" alt="" class="size-8" />
          <span class="text-lg font-bold text-white">NordPress</span>
        </RouterLink>
        <button class="text-gray-500 hover:text-gray-400 lg:hidden" @click="offen = false"><Icon name="schliessen" /></button>
      </div>

      <nav class="space-y-8">
        <div v-for="g in gruppen" :key="g.titel">
          <h3 class="pl-3 text-xs font-semibold uppercase text-gray-500">{{ g.titel }}</h3>
          <ul class="mt-3">
            <li v-for="e in g.eintraege" :key="e.ziel" class="mb-0.5 last:mb-0">
              <RouterLink :to="e.ziel"
                class="flex items-center gap-3 rounded-lg py-2 pr-3 pl-4 text-sm font-medium transition"
                :class="aktiv(e)
                  ? 'bg-linear-to-r from-violet-500/[0.12] to-violet-500/[0.04] text-white'
                  : 'text-gray-400 hover:text-white'">
                <Icon :name="e.icon" :klasse="'size-5 shrink-0 ' + (aktiv(e) ? 'text-violet-400' : 'text-gray-500')" />
                {{ e.name }}
              </RouterLink>
            </li>
          </ul>
        </div>
      </nav>

      <div class="mt-auto pt-8">
        <a href="/" target="_blank" class="flex items-center gap-3 rounded-lg px-4 py-2 text-sm text-gray-400 hover:text-white">
          <Icon name="extern" klasse="size-5 text-gray-500" /> Website ansehen
        </a>
      </div>
    </aside>

    <!-- Inhalt -->
    <div class="relative flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
      <header class="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur-md dark:border-gray-700/60 dark:bg-gray-800/90">
        <div class="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div class="flex items-center gap-3">
            <button class="text-gray-500 hover:text-gray-600 lg:hidden dark:hover:text-gray-400" @click="offen = true"><Icon name="menue" /></button>
            <span class="hidden text-sm font-medium text-gray-500 sm:block">{{ route.meta.titel }}</span>
          </div>
          <div class="flex items-center gap-3">
            <button class="flex size-9 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/50" :title="dunkel ? 'Hell' : 'Dunkel'" @click="umschalten">
              <Icon :name="dunkel ? 'sonne' : 'mond'" klasse="size-4.5 text-gray-500 dark:text-gray-400" />
            </button>
            <div class="h-6 w-px bg-gray-200 dark:bg-gray-700/60" />
            <div class="relative">
              <button class="flex items-center gap-2" @click="menue = !menue">
                <span class="flex size-8 items-center justify-center rounded-full bg-violet-500 text-xs font-semibold text-white">{{ initialen }}</span>
                <span class="hidden text-left md:block">
                  <span class="block text-sm font-medium text-gray-700 dark:text-gray-200">{{ sitzung.benutzer?.name }}</span>
                </span>
              </button>
              <div v-if="menue" class="absolute right-0 mt-2 w-56 rounded-lg border border-gray-200 bg-white py-1.5 shadow-lg dark:border-gray-700/60 dark:bg-gray-800">
                <div class="mb-1 border-b border-gray-200 px-3 pt-0.5 pb-2 dark:border-gray-700/60">
                  <div class="font-medium text-gray-800 dark:text-gray-100">{{ sitzung.benutzer?.name }}</div>
                  <div class="text-xs text-gray-500 italic">{{ ROLLEN[sitzung.benutzer?.role] }}</div>
                </div>
                <button class="flex w-full items-center gap-2 px-3 py-1.5 text-sm font-medium text-violet-500 hover:text-violet-600" @click="abmelden">
                  <Icon name="abmelden" klasse="size-4" /> Abmelden
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main class="mx-auto w-full max-w-9xl px-4 py-8 sm:px-6 lg:px-8">
        <RouterView />
      </main>
    </div>
  </div>
</template>
