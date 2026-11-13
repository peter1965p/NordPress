<script setup>
// Felder eines Formulars, wie die Liefer-API sie beschreibt. Auf der Website und in der Vorschau des Formular-Editors.
defineProps({ felder: { type: Array, default: () => [] }, deaktiviert: Boolean })
const werte = defineModel({ type: Object, default: () => ({}) })

// [Text](/link) in Beschriftungen wird zum Link, z. B. für die Datenschutzerklärung. Kein v-html: nur Text und geprüfte Links.
const LINK = /\[([^\]]+)\]\(((?:https?:\/\/|\/(?!\/)|#|mailto:)[^)\s]*)\)/g
function teile(label) {
  const out = []
  let rest = 0
  for (const m of label.matchAll(LINK)) {
    if (m.index > rest) out.push({ text: label.slice(rest, m.index) })
    out.push({ text: m[1], link: m[2] })
    rest = m.index + m[0].length
  }
  if (rest < label.length) out.push({ text: label.slice(rest) })
  return out
}

const FELD = 'w-full rounded-np border border-gray-300 bg-white px-4 py-2.5 text-base text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-akzent focus:ring-2 focus:ring-akzent/25 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'
const TYP = { text: 'text', email: 'email', telefon: 'tel' }
const AUTO = { email: 'email', telefon: 'tel' }
</script>

<template>
  <div class="grid gap-5 @2xl:grid-cols-2">
    <div v-for="f in felder" :key="f.id" :class="f.breite === 'halb' ? '' : '@2xl:col-span-2'">
      <label v-if="f.typ === 'checkbox'" class="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
        <input v-model="werte[f.id]" type="checkbox" :required="f.pflicht" :disabled="deaktiviert"
          class="mt-0.5 size-5 shrink-0 rounded border-gray-300 accent-[var(--color-akzent)]" />
        <span>
          <template v-for="(t, i) in teile(f.label)" :key="i">
            <a v-if="t.link" :href="t.link" target="_blank" rel="noopener" class="font-medium underline underline-offset-2">{{ t.text }}</a>
            <template v-else>{{ t.text }}</template>
          </template>
          <span v-if="f.pflicht" class="text-akzent"> *</span>
        </span>
      </label>

      <template v-else>
        <label :for="`np-feld-${f.id}`" class="mb-1.5 block text-sm font-semibold">
          {{ f.label }}<span v-if="f.pflicht" class="text-akzent"> *</span>
        </label>
        <textarea v-if="f.typ === 'textarea'" :id="`np-feld-${f.id}`" v-model="werte[f.id]" rows="5" maxlength="5000"
          :required="f.pflicht" :placeholder="f.platzhalter" :disabled="deaktiviert" :class="FELD" class="resize-y" />
        <select v-else-if="f.typ === 'auswahl'" :id="`np-feld-${f.id}`" v-model="werte[f.id]" :required="f.pflicht" :disabled="deaktiviert" :class="FELD">
          <option value="" disabled>{{ f.platzhalter || 'Bitte wählen …' }}</option>
          <option v-for="o in f.optionen" :key="o" :value="o">{{ o }}</option>
        </select>
        <input v-else :id="`np-feld-${f.id}`" v-model="werte[f.id]" :type="TYP[f.typ]" :autocomplete="AUTO[f.typ]"
          :maxlength="f.typ === 'telefon' ? 50 : 300" :required="f.pflicht" :placeholder="f.platzhalter" :disabled="deaktiviert" :class="FELD" />
      </template>
    </div>
  </div>
</template>
