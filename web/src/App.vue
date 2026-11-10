<script setup>
import { meldungen } from './api.js'
</script>

<template>
  <RouterView />
  <div class="pointer-events-none fixed top-4 right-4 z-50 flex flex-col gap-2">
    <TransitionGroup enter-from-class="opacity-0 translate-y-2" leave-to-class="opacity-0" enter-active-class="transition" leave-active-class="transition">
      <div v-for="m in meldungen" :key="m.id"
        class="pointer-events-auto flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-lg"
        :class="m.art === 'fehler' ? 'bg-red-500' : 'bg-green-500'">
        {{ m.text }}
      </div>
    </TransitionGroup>
  </div>
</template>
