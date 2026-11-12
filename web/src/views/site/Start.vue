<script setup>
// Startseite: die in den Einstellungen gewählte Seite, sonst die neuesten Beiträge.
// Ist die gewählte Seite gelöscht oder nur Entwurf, erscheinen ebenfalls die Beiträge.
import { inject, ref } from 'vue'
import Blog from './Blog.vue'
import Inhalt from './Inhalt.vue'

const einst = inject('einstellungen')
const fehlt = ref(false)
</script>

<template>
  <template v-if="einst.geladen">
    <Inhalt v-if="einst.startseite && !fehlt" typ="pages" :slug="einst.startseite" startseite @fehlt="fehlt = true" />
    <div v-else class="mx-auto max-w-5xl px-4 py-10 sm:px-6"><Blog /></div>
  </template>
</template>
