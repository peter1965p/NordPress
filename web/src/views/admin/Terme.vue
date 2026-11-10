<script setup>
import { computed, ref, watch } from 'vue'
import Icon from '../../components/Icon.vue'
import { admin, darf, melde } from '../../api.js'

const props = defineProps({ taxonomie: { type: String, required: true } })
const kategorie = computed(() => props.taxonomie === 'category')
const titel = computed(() => (kategorie.value ? 'Kategorien' : 'Schlagwörter'))
const darfAnlegen = computed(() => !kategorie.value || darf('editor'))

const terme = ref([])
const neu = ref({ name: '', slug: '' })
const bearbeiten = ref(null)

async function laden() { terme.value = (await admin.get(`/terms?taxonomy=${props.taxonomie}`)).items }
watch(() => props.taxonomie, laden, { immediate: true })

async function anlegen() {
  try {
    await admin.post('/terms', { taxonomy: props.taxonomie, name: neu.value.name, ...(neu.value.slug ? { slug: neu.value.slug } : {}) })
    neu.value = { name: '', slug: '' }
    melde('Angelegt')
    laden()
  } catch (e) { melde(e.message, 'fehler') }
}

async function speichern() {
  await admin.put(`/terms/${bearbeiten.value.id}`, { name: bearbeiten.value.name, slug: bearbeiten.value.slug })
  bearbeiten.value = null
  melde('Gespeichert')
  laden()
}

async function loeschen(t) {
  if (!confirm(`„${t.name}“ löschen? Die Beiträge bleiben erhalten.`)) return
  await admin.del(`/terms/${t.id}`)
  laden()
}
</script>

<template>
  <h1 class="mb-8 text-2xl font-bold md:text-3xl">{{ titel }}</h1>
  <div class="grid gap-6 lg:grid-cols-[20rem_1fr]">
    <form v-if="darfAnlegen" class="karte h-fit space-y-4 p-5" @submit.prevent="anlegen">
      <h2 class="font-semibold">{{ kategorie ? 'Neue Kategorie' : 'Neues Schlagwort' }}</h2>
      <div><label class="etikett">Name</label><input v-model="neu.name" class="feld" required maxlength="80" /></div>
      <div><label class="etikett">Slug <span class="font-normal text-gray-400">(optional)</span></label><input v-model="neu.slug" class="feld font-mono" placeholder="automatisch" /></div>
      <button class="knopf-haupt w-full"><Icon name="plus" klasse="size-4" /> Hinzufügen</button>
    </form>
    <div class="karte overflow-x-auto" :class="darfAnlegen ? '' : 'lg:col-span-2'">
      <table class="tabelle w-full">
        <thead><tr><th>Name</th><th>Slug</th><th>Beiträge</th><th class="w-24" /></tr></thead>
        <tbody>
          <tr v-for="t in terme" :key="t.id">
            <template v-if="bearbeiten?.id === t.id">
              <td><input v-model="bearbeiten.name" class="feld" /></td>
              <td><input v-model="bearbeiten.slug" class="feld font-mono" /></td>
              <td>{{ t.count }}</td>
              <td><div class="flex gap-1"><button class="knopf-akzent px-2 py-1" @click="speichern">OK</button><button class="knopf-rand px-2 py-1" @click="bearbeiten = null">×</button></div></td>
            </template>
            <template v-else>
              <td class="font-medium text-gray-800 dark:text-gray-100">{{ t.name }}</td>
              <td class="font-mono text-xs">{{ t.slug }}</td>
              <td>{{ t.count }}</td>
              <td>
                <div v-if="darf('editor')" class="flex justify-end gap-1">
                  <button class="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-violet-500 dark:hover:bg-gray-700/50" @click="bearbeiten = { ...t }"><Icon name="stift" klasse="size-4" /></button>
                  <button class="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-700/50" @click="loeschen(t)"><Icon name="muell" klasse="size-4" /></button>
                </div>
              </td>
            </template>
          </tr>
          <tr v-if="!terme.length"><td colspan="4" class="py-10 text-center text-gray-400">Noch keine {{ titel }}.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
