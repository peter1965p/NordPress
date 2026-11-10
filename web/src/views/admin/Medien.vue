<script setup>
import { ref } from 'vue'
import Icon from '../../components/Icon.vue'
import { admin, darf, datum, melde, sitzung } from '../../api.js'

const medien = ref([])
const auswahl = ref(null)
const laedt = ref(false)
const ziehen = ref(false)

async function laden() { medien.value = (await admin.get('/media')).items }
laden()

async function hochladen(dateien) {
  laedt.value = true
  for (const datei of dateien) {
    const form = new FormData()
    form.append('alt', datei.name.replace(/\.[^.]+$/, ''))
    form.append('datei', datei)
    try { await admin.post('/media', form) } catch (e) { melde(`${datei.name}: ${e.message}`, 'fehler') }
  }
  laedt.value = false
  await laden()
}

const darfAendern = m => darf('editor') || m.uploaded_by === sitzung.benutzer?.id

async function altSpeichern() {
  const m = await admin.put(`/media/${auswahl.value.id}`, { alt: auswahl.value.alt })
  Object.assign(medien.value.find(x => x.id === m.id), m)
  melde('Alternativtext gespeichert')
}

async function loeschen(m) {
  if (!confirm(`„${m.original_name}“ löschen? Beiträge verlieren dann ihr Beitragsbild.`)) return
  await admin.del(`/media/${m.id}`)
  auswahl.value = null
  melde('Gelöscht')
  laden()
}

const groesse = b => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`)
</script>

<template>
  <div class="mb-8 sm:flex sm:items-center sm:justify-between">
    <h1 class="text-2xl font-bold md:text-3xl">Mediathek</h1>
    <label class="knopf-haupt mt-4 cursor-pointer sm:mt-0">
      <Icon name="hochladen" klasse="size-4" /> {{ laedt ? 'Lädt hoch …' : 'Hochladen' }}
      <input type="file" multiple accept="image/jpeg,image/png,image/gif,image/webp" class="hidden" @change="e => hochladen([...e.target.files])" />
    </label>
  </div>

  <div class="karte mb-6 flex flex-col items-center justify-center gap-2 border-2 border-dashed p-8 text-sm transition"
    :class="ziehen ? 'border-violet-400 bg-violet-500/5 text-violet-500' : 'border-gray-200 text-gray-400 dark:border-gray-700'"
    @dragover.prevent="ziehen = true" @dragleave="ziehen = false" @drop.prevent="ziehen = false; hochladen([...$event.dataTransfer.files])">
    <Icon name="hochladen" klasse="size-6" />
    Bilder hierher ziehen · JPEG, PNG, GIF oder WebP
  </div>

  <div class="grid gap-6 lg:grid-cols-[1fr_18rem]">
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
      <button v-for="m in medien" :key="m.id" class="karte group overflow-hidden text-left ring-violet-500 transition"
        :class="auswahl?.id === m.id ? 'ring-2' : 'hover:ring-2 hover:ring-violet-300'" @click="auswahl = { ...m }">
        <img :src="m.url" :alt="m.alt" class="aspect-square w-full object-cover" loading="lazy" />
        <div class="truncate px-3 py-2 text-xs">{{ m.original_name }}</div>
      </button>
      <p v-if="!medien.length" class="col-span-full py-10 text-center text-gray-400">Noch keine Medien.</p>
    </div>

    <aside v-if="auswahl" class="karte h-fit p-5 lg:sticky lg:top-24">
      <img :src="auswahl.url" :alt="auswahl.alt" class="mb-4 w-full rounded-lg" />
      <dl class="mb-4 space-y-1 text-sm">
        <div class="flex justify-between gap-2"><dt>Datei</dt><dd class="truncate font-medium text-gray-800 dark:text-gray-100">{{ auswahl.original_name }}</dd></div>
        <div class="flex justify-between"><dt>Typ</dt><dd>{{ auswahl.mime }}</dd></div>
        <div class="flex justify-between"><dt>Größe</dt><dd>{{ groesse(auswahl.size) }}</dd></div>
        <div class="flex justify-between"><dt>Hochgeladen</dt><dd>{{ datum(auswahl.created_at) }}</dd></div>
        <div class="flex justify-between"><dt>Von</dt><dd>{{ auswahl.uploaded_by_name || '–' }}</dd></div>
      </dl>
      <label class="etikett">Alternativtext</label>
      <input v-model="auswahl.alt" class="feld mb-2" :disabled="!darfAendern(auswahl)" />
      <div class="mb-4 font-mono text-xs break-all text-gray-400">{{ auswahl.url }}</div>
      <div v-if="darfAendern(auswahl)" class="flex gap-2">
        <button class="knopf-haupt flex-1" @click="altSpeichern">Speichern</button>
        <button class="knopf-gefahr" title="Löschen" @click="loeschen(auswahl)"><Icon name="muell" klasse="size-4" /></button>
      </div>
    </aside>
  </div>
</template>
