<script setup>
import { ref } from 'vue'
import Icon from '../../components/Icon.vue'
import { admin, datum, melde, sitzung, ROLLEN } from '../../api.js'

const benutzer = ref([])
const form = ref(null)

async function laden() { benutzer.value = (await admin.get('/users')).items }
laden()

const neu = () => { form.value = { email: '', name: '', role: 'author', password: '' } }

async function speichern() {
  const f = { ...form.value }
  if (f.id && !f.password) delete f.password
  const { id, created_at, ...daten } = f
  try {
    if (id) await admin.put(`/users/${id}`, daten)
    else await admin.post('/users', daten)
    melde('Gespeichert')
    form.value = null
    laden()
  } catch (e) { melde(e.message, 'fehler') }
}

async function loeschen(u) {
  if (!confirm(`${u.name} löschen? Beiträge bleiben, verlieren aber den Autor.`)) return
  try { await admin.del(`/users/${u.id}`); laden() } catch (e) { melde(e.message, 'fehler') }
}

const ROLLENFARBE = { admin: 'bg-violet-500/15 text-violet-700 dark:text-violet-400', editor: 'bg-sky-500/15 text-sky-700 dark:text-sky-400', author: 'bg-gray-500/15 text-gray-700 dark:text-gray-300' }
</script>

<template>
  <div class="mb-8 sm:flex sm:items-center sm:justify-between">
    <h1 class="text-2xl font-bold md:text-3xl">Benutzer</h1>
    <button class="knopf-haupt mt-4 sm:mt-0" @click="neu"><Icon name="plus" klasse="size-4" /> Neuer Benutzer</button>
  </div>

  <div class="grid gap-6" :class="form ? 'lg:grid-cols-[1fr_22rem]' : ''">
    <div class="karte overflow-x-auto">
      <table class="tabelle w-full">
        <thead><tr><th>Name</th><th>E-Mail</th><th>Rolle</th><th class="hidden md:table-cell">Seit</th><th class="w-24" /></tr></thead>
        <tbody>
          <tr v-for="u in benutzer" :key="u.id">
            <td class="font-medium text-gray-800 dark:text-gray-100">{{ u.name }} <span v-if="u.id === sitzung.benutzer?.id" class="text-xs text-gray-400">(du)</span></td>
            <td>{{ u.email }}</td>
            <td><span class="marke" :class="ROLLENFARBE[u.role]">{{ ROLLEN[u.role] }}</span></td>
            <td class="hidden md:table-cell">{{ datum(u.created_at) }}</td>
            <td>
              <div class="flex justify-end gap-1">
                <button class="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-violet-500 dark:hover:bg-gray-700/50" @click="form = { ...u, password: '' }"><Icon name="stift" klasse="size-4" /></button>
                <button v-if="u.id !== sitzung.benutzer?.id" class="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-700/50" @click="loeschen(u)"><Icon name="muell" klasse="size-4" /></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <form v-if="form" class="karte h-fit space-y-4 p-5" @submit.prevent="speichern">
      <h2 class="font-semibold">{{ form.id ? 'Benutzer bearbeiten' : 'Neuer Benutzer' }}</h2>
      <div><label class="etikett">Name</label><input v-model="form.name" class="feld" required /></div>
      <div><label class="etikett">E-Mail</label><input v-model="form.email" type="email" class="feld" required /></div>
      <div>
        <label class="etikett">Rolle</label>
        <select v-model="form.role" class="feld">
          <option v-for="(name, rolle) in ROLLEN" :key="rolle" :value="rolle">{{ name }}</option>
        </select>
        <p class="mt-1 text-xs text-gray-400">Autor: eigene Beiträge · Redakteur: alle Inhalte · Administrator: zusätzlich Benutzer und Einstellungen</p>
      </div>
      <div>
        <label class="etikett">Passwort <span v-if="form.id" class="font-normal text-gray-400">(leer lassen = unverändert)</span></label>
        <input v-model="form.password" type="password" class="feld" :required="!form.id" minlength="12" autocomplete="new-password" />
        <p class="mt-1 text-xs text-gray-400">Mindestens 12 Zeichen. Ein neues Passwort meldet alle Sitzungen ab.</p>
      </div>
      <div class="flex gap-2"><button class="knopf-haupt flex-1">Speichern</button><button type="button" class="knopf-rand" @click="form = null">Abbrechen</button></div>
    </form>
  </div>
</template>
