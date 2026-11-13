<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '../../components/Icon.vue'
import { admin, datum, melde } from '../../api.js'

const router = useRouter()
const formulare = ref([])
const name = ref('')

async function laden() { formulare.value = (await admin.get('/forms')).items }
laden()

// Neues Formular startet als Kontaktformular, das man dann anpasst
const VORLAGE = [
  { id: 'name', typ: 'text', label: 'Name', pflicht: true, breite: 'halb' },
  { id: 'email', typ: 'email', label: 'E-Mail', pflicht: true, breite: 'halb' },
  { id: 'telefon', typ: 'telefon', label: 'Telefon', breite: 'halb' },
  { id: 'nachricht', typ: 'textarea', label: 'Nachricht', pflicht: true, breite: 'voll' },
  { id: 'datenschutz', typ: 'checkbox', label: 'Ich habe die [Datenschutzerklärung](/seite/datenschutz) gelesen und stimme zu.', pflicht: true, breite: 'voll' },
]

async function anlegen() {
  try {
    const f = await admin.post('/forms', { name: name.value, felder: VORLAGE })
    router.push(`/admin/formulare/${f.id}`)
  } catch (e) { melde(e.message, 'fehler') }
}

async function loeschen(f) {
  if (!confirm(`„${f.name}“ mit allen ${f.anzahl} Einsendungen löschen? Seiten mit diesem Formular zeigen es dann nicht mehr.`)) return
  await admin.del(`/forms/${f.id}`)
  melde('Gelöscht')
  laden()
}
</script>

<template>
  <h1 class="mb-8 text-2xl font-bold md:text-3xl">Formulare</h1>
  <div class="grid gap-6 lg:grid-cols-[20rem_1fr]">
    <form class="karte h-fit space-y-4 p-5" @submit.prevent="anlegen">
      <h2 class="font-semibold">Neues Formular</h2>
      <div><label class="etikett">Name</label><input v-model="name" class="feld" required maxlength="120" placeholder="z. B. Kontakt, Bewerbung" /></div>
      <p class="text-xs text-gray-400">Startet mit Name, E-Mail, Telefon, Nachricht und Datenschutz-Häkchen. Felder passt du danach an.</p>
      <button class="knopf-haupt w-full"><Icon name="plus" klasse="size-4" /> Anlegen</button>
    </form>
    <div class="karte overflow-x-auto">
      <table class="tabelle w-full">
        <thead><tr><th>Name</th><th>Felder</th><th>Einsendungen</th><th>Letzte</th><th class="w-24" /></tr></thead>
        <tbody>
          <tr v-for="f in formulare" :key="f.id" class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/20" @click="router.push(`/admin/formulare/${f.id}`)">
            <td class="font-medium text-gray-800 dark:text-gray-100">{{ f.name }}</td>
            <td>{{ f.feldzahl }}</td>
            <td>
              {{ f.anzahl }}
              <span v-if="f.ungelesen" class="marke ml-1 bg-violet-500/15 text-violet-600 dark:text-violet-300">{{ f.ungelesen }} neu</span>
            </td>
            <td>{{ f.letzte ? datum(f.letzte, true) : '–' }}</td>
            <td>
              <div class="flex justify-end gap-1">
                <button class="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-violet-500 dark:hover:bg-gray-700/50" title="Bearbeiten"><Icon name="stift" klasse="size-4" /></button>
                <button class="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-700/50" title="Löschen" @click.stop="loeschen(f)"><Icon name="muell" klasse="size-4" /></button>
              </div>
            </td>
          </tr>
          <tr v-if="!formulare.length"><td colspan="5" class="py-10 text-center text-gray-400">Noch keine Formulare.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
