<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import BlockAnzeige from '../../components/bloecke/BlockAnzeige.vue'
import { datum, oeffentlich } from '../../api.js'

// slug kommt aus der Adresse oder, auf der Startseite, aus den Einstellungen
const props = defineProps({ typ: { type: String, required: true }, slug: { type: String, default: '' }, startseite: Boolean })
const emit = defineEmits(['fehlt'])
const route = useRoute()
const inhalt = ref(null)
const fehlt = ref(false)

watch(() => props.slug || route.params.slug, async slug => {
  fehlt.value = false
  try {
    inhalt.value = await oeffentlich(`/${props.typ}/${encodeURIComponent(slug)}`)
    if (!props.startseite) document.title = inhalt.value.title
  } catch {
    inhalt.value = null
    fehlt.value = true
    if (props.startseite) emit('fehlt')
  }
}, { immediate: true })

// Beginnt der Inhalt mit einem Hero, ist der Hero der Kopf. Sonst Titel, Datum und Beitragsbild wie gewohnt.
const mitKopf = computed(() => !props.startseite && inhalt.value?.blocks?.[0]?.typ !== 'hero')
</script>

<template>
  <article v-if="inhalt" class="pb-12">
    <header v-if="mitKopf" class="mx-auto max-w-3xl px-6 pt-10">
      <div v-if="inhalt.categories.length" class="mb-3 flex gap-2 text-xs font-semibold text-akzent uppercase">
        <RouterLink v-for="k in inhalt.categories" :key="k.slug" :to="`/kategorie/${k.slug}`">{{ k.name }}</RouterLink>
      </div>
      <h1 class="mb-4 font-titel text-3xl leading-tight font-bold md:text-4xl">{{ inhalt.title }}</h1>
      <div v-if="inhalt.type === 'post'" class="mb-8 text-sm text-gray-400">{{ datum(inhalt.published_at) }}<template v-if="inhalt.author"> · {{ inhalt.author.name }}</template></div>
      <img v-if="inhalt.featured_media" :src="inhalt.featured_media.url" :alt="inhalt.featured_media.alt" class="mb-2 w-full rounded-np" />
    </header>
    <BlockAnzeige :bloecke="inhalt.blocks" />
    <div v-if="inhalt.tags.length" class="mx-auto mt-6 flex max-w-3xl flex-wrap gap-2 px-6">
      <span v-for="t in inhalt.tags" :key="t.slug" class="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300"># {{ t.name }}</span>
    </div>
  </article>
  <p v-else-if="fehlt" class="py-20 text-center text-gray-400">{{ typ === 'pages' ? 'Diese Seite' : 'Diesen Beitrag' }} gibt es nicht (mehr).</p>
</template>
