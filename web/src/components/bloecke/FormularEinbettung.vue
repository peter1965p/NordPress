<script setup>
// Ein Formular samt Absenden, Fehler- und Erfolgsmeldung. Genutzt vom Block „Formular“ und von Karten.
// Holt die Felder beim Anzeigen über die Liefer-API, damit Änderungen am Formular sofort gelten.
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Icon from '../Icon.vue'
import FormularFelder from './FormularFelder.vue'
import { oeffentlich, oeffentlichSenden } from '../../api.js'

const props = defineProps({ formularId: { type: Number, default: null } })
const route = useRoute()
// In der Editor-Vorschau nichts wirklich absenden
const vorschau = computed(() => route.path.startsWith('/admin'))

const formular = ref(null)
const fehlt = ref(false)
const werte = ref({})
const website = ref('')
const sendet = ref(false)
const fehler = ref('')
const erfolg = ref('')

watch(() => props.formularId, async id => {
  formular.value = null
  fehlt.value = false
  if (!id) return
  try {
    formular.value = await oeffentlich(`/forms/${id}`)
    werte.value = Object.fromEntries(formular.value.felder.map(f => [f.id, f.typ === 'checkbox' ? false : '']))
  } catch { fehlt.value = true }
}, { immediate: true })

async function absenden() {
  if (vorschau.value) return
  sendet.value = true
  fehler.value = ''
  try {
    erfolg.value = (await oeffentlichSenden(`/forms/${formular.value.id}/einsendungen`, { werte: werte.value, website: website.value })).nachricht
  } catch (e) {
    fehler.value = e.message
  } finally {
    sendet.value = false
  }
}
</script>

<template>
  <!-- Eigener Container: Felder richten sich nach der Breite des Formulars, nicht der Seite (z. B. in einer Karte) -->
  <div class="@container">
    <div v-if="erfolg" class="flex items-start gap-3 rounded-np bg-emerald-50 p-5 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
      <Icon name="haken" klasse="size-6 shrink-0" />
      <p class="whitespace-pre-line">{{ erfolg }}</p>
    </div>

    <form v-else-if="formular" class="relative space-y-6" @submit.prevent="absenden">
      <FormularFelder v-model="werte" :felder="formular.felder" :deaktiviert="sendet" />
      <!-- Für Menschen unsichtbar, Bots füllen es aus -->
      <div class="absolute -left-[9999px]" aria-hidden="true">
        <label>Website <input v-model="website" type="text" name="website" tabindex="-1" autocomplete="off" /></label>
      </div>
      <p v-if="fehler" class="rounded-np bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{{ fehler }}</p>
      <div class="flex flex-wrap items-center gap-4">
        <button type="submit" :disabled="sendet || vorschau"
          class="inline-flex items-center gap-2 rounded-knopf bg-akzent px-6 py-3 text-sm font-semibold text-akzent-text shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60">
          {{ sendet ? 'Wird gesendet …' : formular.absenden_text }}
        </button>
        <span v-if="vorschau" class="text-xs opacity-60">Vorschau: Absenden ist hier ausgeschaltet.</span>
        <span v-else-if="formular.felder.some(f => f.pflicht)" class="text-xs opacity-60">* Pflichtfeld</span>
      </div>
    </form>

    <p v-else-if="vorschau && (fehlt || !formularId)" class="rounded-np border border-dashed border-gray-300 py-10 text-center text-sm text-gray-400 dark:border-gray-600">
      {{ formularId ? 'Dieses Formular gibt es nicht mehr.' : 'Noch kein Formular gewählt.' }}
    </p>
  </div>
</template>
