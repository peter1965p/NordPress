<script setup>
import { onMounted, ref } from 'vue'
import Icon from './Icon.vue'
import { admin, melde } from '../api.js'

const emit = defineEmits(['gewaehlt', 'schliessen'])
const medien = ref([])
const laedt = ref(false)

async function laden() { medien.value = (await admin.get('/media')).items }
onMounted(laden)

async function hochladen(e) {
  const datei = e.target.files[0]
  if (!datei) return
  const form = new FormData()
  form.append('alt', datei.name.replace(/\.[^.]+$/, ''))
  form.append('datei', datei)
  laedt.value = true
  try {
    const m = await admin.post('/media', form)
    emit('gewaehlt', m)
  } catch (err) {
    melde(err.message, 'fehler')
  } finally {
    laedt.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4" @click.self="emit('schliessen')">
    <div class="karte flex max-h-[80dvh] w-full max-w-3xl flex-col">
      <header class="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-700/60">
        <h2 class="font-semibold">Bild wählen</h2>
        <div class="flex items-center gap-2">
          <label class="knopf-akzent cursor-pointer">
            <Icon name="hochladen" klasse="size-4" /> {{ laedt ? 'Lädt …' : 'Hochladen' }}
            <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" class="hidden" @change="hochladen" />
          </label>
          <button class="p-1 text-gray-400 hover:text-gray-500" @click="emit('schliessen')"><Icon name="schliessen" /></button>
        </div>
      </header>
      <div class="grid grid-cols-3 gap-3 overflow-y-auto p-5 sm:grid-cols-4">
        <button v-for="m in medien" :key="m.id" class="group overflow-hidden rounded-lg ring-violet-500 hover:ring-2" @click="emit('gewaehlt', m)">
          <img :src="m.url" :alt="m.alt" class="aspect-square w-full object-cover" loading="lazy" />
        </button>
        <p v-if="!medien.length" class="col-span-full py-8 text-center text-sm text-gray-400">Noch keine Bilder. Lade eins hoch.</p>
      </div>
    </div>
  </div>
</template>
