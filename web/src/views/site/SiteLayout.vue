<script setup>
import { computed, provide, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import ThemeRahmen from '../../components/ThemeRahmen.vue'
import { oeffentlich } from '../../api.js'

// Das öffentliche Frontend nutzt ausschließlich die Headless-API, genau wie ein fremdes Frontend es täte.
const route = useRoute()
const einst = reactive({ title: '', tagline: '', theme: null, startseite: '', geladen: false })
provide('einstellungen', einst)
const seiten = ref([])
const kategorien = ref([])
// Die Startseite steht im Menü als „Start“, nicht noch einmal unter ihrem Titel
const menue = computed(() => seiten.value.filter(s => s.slug !== einst.startseite))
oeffentlich('/settings').then(d => { Object.assign(einst, d, { geladen: true }); document.title = d.title })
  .catch(() => { einst.geladen = true })
oeffentlich('/pages').then(d => { seiten.value = d.items })
oeffentlich('/categories').then(d => { kategorien.value = d.items.filter(k => k.count > 0) })
</script>

<template>
  <ThemeRahmen :theme="einst.theme">
  <div class="min-h-dvh bg-white dark:bg-gray-900">
    <header class="border-b border-gray-100 dark:border-gray-800">
      <div class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6">
        <RouterLink to="/" class="group">
          <div class="font-titel text-xl font-bold text-gray-900 group-hover:text-akzent dark:text-gray-100">{{ einst.title }}</div>
          <div class="text-sm text-gray-500">{{ einst.tagline }}</div>
        </RouterLink>
        <nav class="flex flex-wrap gap-5 text-sm font-medium">
          <RouterLink to="/" class="text-gray-600 hover:text-akzent dark:text-gray-300">Start</RouterLink>
          <RouterLink v-if="einst.startseite" to="/blog" class="text-gray-600 hover:text-akzent dark:text-gray-300" active-class="!text-akzent">Blog</RouterLink>
          <RouterLink v-for="s in menue" :key="s.slug" :to="`/seite/${s.slug}`" class="text-gray-600 hover:text-akzent dark:text-gray-300">{{ s.title }}</RouterLink>
        </nav>
      </div>
      <div v-if="kategorien.length && (route.path !== '/' || !einst.startseite)" class="mx-auto flex max-w-5xl flex-wrap gap-2 px-4 pb-4 sm:px-6">
        <RouterLink v-for="k in kategorien" :key="k.slug" :to="`/kategorie/${k.slug}`"
          class="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-akzent/10 hover:text-akzent dark:bg-gray-800 dark:text-gray-300"
          active-class="!bg-akzent !text-akzent-text">{{ k.name }} · {{ k.count }}</RouterLink>
      </div>
    </header>
    <!-- Beiträge und Seiten bestimmen ihre Breite selbst, damit Blöcke über die ganze Breite gehen können -->
    <main :class="route.meta.vollbreite ? '' : 'mx-auto max-w-5xl px-4 py-10 sm:px-6'">
      <RouterView />
    </main>
    <footer class="border-t border-gray-100 py-8 text-center text-xs text-gray-400 dark:border-gray-800">
      Betrieben mit NordPress · <a href="/api/v1/posts" class="hover:text-akzent">REST-API</a> · <RouterLink to="/admin" class="hover:text-akzent">Anmelden</RouterLink>
    </footer>
  </div>
  </ThemeRahmen>
</template>
