<script setup>
// Code auf der Website: nur als Text ({{ }} maskiert), nie als HTML. Ohne Syntaxfarben, damit die Website kein Monaco lädt.
import { ref } from 'vue'
import Icon from '../Icon.vue'
import { SPRACHEN } from '../../bloecke/typen.js'

defineProps({ b: { type: Object, required: true } })
const kopiert = ref(false)

async function kopieren(text) {
  try {
    await navigator.clipboard.writeText(text)
    kopiert.value = true
    setTimeout(() => { kopiert.value = false }, 1500)
  } catch { /* ohne Freigabe für die Zwischenablage passiert nichts */ }
}
</script>

<template>
  <figure class="mx-auto my-6 max-w-3xl px-6">
    <div class="overflow-hidden rounded-np bg-gray-900 shadow-sm ring-1 ring-white/10">
      <figcaption class="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs text-gray-400">
        <span class="font-mono">{{ b.dateiname || SPRACHEN[b.sprache] || b.sprache }}</span>
        <button type="button" class="flex items-center gap-1 hover:text-white" @click="kopieren(b.quelle)">
          <Icon :name="kopiert ? 'haken' : 'kopie'" klasse="size-3.5" /> {{ kopiert ? 'Kopiert' : 'Kopieren' }}
        </button>
      </figcaption>
      <pre class="overflow-x-auto p-4 text-sm leading-relaxed text-gray-100"><code :class="`language-${b.sprache}`">{{ b.quelle }}</code></pre>
    </div>
  </figure>
</template>
