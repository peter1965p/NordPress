<script setup>
import Icon from '../Icon.vue'
import { STILE } from '../../bloecke/typen.js'

const liste = defineModel({ type: Array, required: true })
defineProps({ mindestens: { type: Number, default: 0 } })
</script>

<template>
  <div class="space-y-2">
    <div v-for="(k, i) in liste" :key="i" class="grid grid-cols-[1fr_1fr_auto] items-center gap-2 rounded-lg border border-gray-100 p-2 @3xl:grid-cols-[1fr_1.4fr_8rem_auto_auto] @3xl:border-0 @3xl:p-0 dark:border-gray-700/60">
      <input v-model="k.text" class="feld" placeholder="Beschriftung" maxlength="80" />
      <input v-model="k.link" class="feld font-mono text-xs" placeholder="https://… oder /seite/… oder #anker" maxlength="500" />
      <select v-model="k.stil" class="feld">
        <option v-for="(n, s) in STILE" :key="s" :value="s">{{ n }}</option>
      </select>
      <label class="flex items-center gap-1 text-xs whitespace-nowrap" title="In neuem Fenster öffnen">
        <input v-model="k.neues_fenster" type="checkbox" class="size-4 rounded accent-violet-500" /> neu
      </label>
      <button type="button" class="p-1 text-gray-400 hover:text-red-500 disabled:opacity-30" :disabled="liste.length <= mindestens" title="Entfernen" @click="liste.splice(i, 1)">
        <Icon name="muell" klasse="size-4" />
      </button>
    </div>
    <button v-if="liste.length < 4" type="button" class="flex items-center gap-1 text-sm font-medium text-violet-500" @click="liste.push({ text: 'Button', link: '#', stil: 'primaer' })">
      <Icon name="plus" klasse="size-4" /> Button
    </button>
  </div>
</template>
