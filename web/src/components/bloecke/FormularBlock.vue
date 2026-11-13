<script setup>
// Block „Formular“: Überschrift, Text und das Formular selbst (FormularEinbettung)
import FormularEinbettung from './FormularEinbettung.vue'
import { FLAECHE, istDunkel } from './flaeche.js'

defineProps({ b: { type: Object, required: true } })
</script>

<template>
  <section class="py-16" :class="FLAECHE[b.hintergrund]">
    <div class="mx-auto max-w-2xl px-6" :class="['standard', 'hell', undefined].includes(b.hintergrund) ? 'text-gray-900 dark:text-gray-100' : ''">
      <div v-if="b.titel || b.text" class="mb-8">
        <h2 v-if="b.titel" class="font-titel text-3xl font-bold tracking-tight" :class="istDunkel(b.hintergrund) || b.hintergrund === 'sand' ? '!text-current' : ''">{{ b.titel }}</h2>
        <p v-if="b.text" class="mt-3 text-lg whitespace-pre-line opacity-80">{{ b.text }}</p>
      </div>
      <FormularEinbettung :formular-id="b.formular_id" />
    </div>
  </section>
</template>
