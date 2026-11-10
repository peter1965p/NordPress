<script setup>
import { ref } from 'vue'
import { admin, melde } from '../../api.js'

const e = ref({ title: '', tagline: '' })
admin.get('/settings').then(d => { e.value = { title: d.title || '', tagline: d.tagline || '' } })

async function speichern() {
  await admin.put('/settings', e.value)
  melde('Einstellungen gespeichert')
}
</script>

<template>
  <h1 class="mb-8 text-2xl font-bold md:text-3xl">Einstellungen</h1>
  <form class="karte max-w-2xl space-y-5 p-6" @submit.prevent="speichern">
    <div><label class="etikett">Titel der Website</label><input v-model="e.title" class="feld" maxlength="100" /></div>
    <div><label class="etikett">Untertitel</label><input v-model="e.tagline" class="feld" maxlength="200" /></div>
    <button class="knopf-haupt">Speichern</button>
  </form>
</template>
