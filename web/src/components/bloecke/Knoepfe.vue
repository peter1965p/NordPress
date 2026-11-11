<script setup>
import Icon from '../Icon.vue'

defineProps({ eintraege: { type: Array, default: () => [] }, dunkel: Boolean })

const STIL = {
  primaer: 'bg-akzent text-akzent-text hover:brightness-95',
  sekundaer: 'bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100',
  umriss: 'border border-current text-gray-900 hover:bg-current/10 dark:text-gray-100',
  whatsapp: 'bg-[#25D366] text-white hover:bg-[#1ebe5a]',
}
</script>

<template>
  <div class="flex flex-wrap gap-3">
    <a v-for="(k, i) in eintraege" :key="i" :href="k.link"
      :target="k.neues_fenster ? '_blank' : undefined" :rel="k.neues_fenster ? 'noopener noreferrer' : undefined"
      class="inline-flex items-center gap-2 rounded-knopf px-5 py-2.5 text-sm font-semibold shadow-sm transition"
      :class="[STIL[k.stil] || STIL.primaer, k.stil === 'umriss' && dunkel ? 'text-white' : '']">
      <Icon v-if="k.stil === 'whatsapp'" name="sprechblase" klasse="size-4" />
      {{ k.text }}
      <Icon v-if="k.neues_fenster" name="extern" klasse="size-3.5 opacity-70" />
    </a>
  </div>
</template>
