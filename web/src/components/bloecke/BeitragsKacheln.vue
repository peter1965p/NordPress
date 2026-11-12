<script setup>
// Beiträge als Kacheln. Benutzt von der Beitragsliste und vom Block „Neueste Beiträge“.
import { datum } from '../../api.js'

defineProps({ items: { type: Array, default: () => [] } })
</script>

<template>
  <div class="grid gap-8 @2xl:grid-cols-2 @4xl:grid-cols-3">
    <article v-for="b in items" :key="b.id" class="group flex flex-col">
      <RouterLink :to="`/beitrag/${b.slug}`" class="mb-4 block overflow-hidden rounded-np bg-gray-100 dark:bg-gray-800">
        <img v-if="b.featured_media" :src="b.featured_media.url" :alt="b.featured_media.alt" class="aspect-[16/10] w-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" />
        <div v-else class="aspect-[16/10] w-full bg-[radial-gradient(circle_at_30%_30%,color-mix(in_oklab,var(--color-akzent)_35%,transparent),transparent_60%)]" />
      </RouterLink>
      <div class="mb-2 flex flex-wrap gap-2 text-xs">
        <span v-for="k in b.categories" :key="k.slug" class="font-semibold text-akzent uppercase">{{ k.name }}</span>
      </div>
      <h3 class="mb-2 font-titel text-lg leading-snug font-bold">
        <RouterLink :to="`/beitrag/${b.slug}`" class="hover:text-akzent">{{ b.title }}</RouterLink>
      </h3>
      <p class="mb-3 line-clamp-3 grow text-sm text-gray-600 dark:text-gray-400">{{ b.excerpt }}</p>
      <div class="text-xs text-gray-400">{{ datum(b.published_at) }}<template v-if="b.author"> · {{ b.author.name }}</template></div>
    </article>
  </div>
</template>
