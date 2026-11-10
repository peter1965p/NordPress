<script setup>
import { ref } from 'vue'
import { oeffentlich } from '../../api.js'

// Das öffentliche Frontend nutzt ausschließlich die Headless-API, genau wie ein fremdes Frontend es täte.
const einst = ref({ title: '', tagline: '' })
const seiten = ref([])
const kategorien = ref([])
oeffentlich('/settings').then(d => { einst.value = d; document.title = d.title })
oeffentlich('/pages').then(d => { seiten.value = d.items })
oeffentlich('/categories').then(d => { kategorien.value = d.items.filter(k => k.count > 0) })
</script>

<template>
  <div class="min-h-dvh bg-white dark:bg-gray-900">
    <header class="border-b border-gray-100 dark:border-gray-800">
      <div class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6">
        <RouterLink to="/" class="group">
          <div class="text-xl font-bold text-gray-900 group-hover:text-violet-500 dark:text-gray-100">{{ einst.title }}</div>
          <div class="text-sm text-gray-500">{{ einst.tagline }}</div>
        </RouterLink>
        <nav class="flex flex-wrap gap-5 text-sm font-medium">
          <RouterLink to="/" class="text-gray-600 hover:text-violet-500 dark:text-gray-300">Start</RouterLink>
          <RouterLink v-for="s in seiten" :key="s.slug" :to="`/seite/${s.slug}`" class="text-gray-600 hover:text-violet-500 dark:text-gray-300">{{ s.title }}</RouterLink>
        </nav>
      </div>
      <div v-if="kategorien.length" class="mx-auto flex max-w-5xl flex-wrap gap-2 px-4 pb-4 sm:px-6">
        <RouterLink v-for="k in kategorien" :key="k.slug" :to="`/kategorie/${k.slug}`"
          class="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-violet-500/10 hover:text-violet-600 dark:bg-gray-800 dark:text-gray-300"
          active-class="!bg-violet-500 !text-white">{{ k.name }} · {{ k.count }}</RouterLink>
      </div>
    </header>
    <main class="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <RouterView />
    </main>
    <footer class="border-t border-gray-100 py-8 text-center text-xs text-gray-400 dark:border-gray-800">
      Betrieben mit NordPress · <a href="/api/v1/posts" class="hover:text-violet-500">REST-API</a> · <RouterLink to="/admin" class="hover:text-violet-500">Anmelden</RouterLink>
    </footer>
  </div>
</template>
