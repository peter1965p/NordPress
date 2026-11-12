<script setup>
// NordPress-Logo: das N mit der Möwe im Anflug (logo.svg), dahinter der Schriftzug mit Tux.
defineProps({ klasse: { type: String, default: 'text-lg' }, groesse: { type: String, default: 'size-8' } })
</script>

<template>
  <span class="inline-flex items-center gap-3">
    <img src="/logo.svg" alt="" :class="groesse" />
    <span class="inline-flex items-end gap-1.5">
      <span class="font-bold" :class="klasse">NordPress</span>
      <!-- Tux, schlicht nachgezeichnet -->
      <svg viewBox="0 0 24 28" class="mb-0.5 h-[1.15em] w-auto shrink-0" :class="klasse" aria-hidden="true">
        <path d="M5 13c0-6 3-10 7-10s7 4 7 10v4c1.5 1 2.5 3 2 5-1-.5-2-1-2.5-1.5C17 24 15 26 12 26s-5-2-6.5-5.5C5 21 4 21.5 3 22c-.5-2 .5-4 2-5z"
          fill="#111827" stroke="#fff" stroke-opacity=".35" stroke-width=".6" />
        <ellipse cx="12" cy="18" rx="5" ry="7" fill="#f8fafc" />
        <ellipse cx="9.9" cy="8.2" rx="1.6" ry="2.1" fill="#fff" />
        <ellipse cx="14.1" cy="8.2" rx="1.6" ry="2.1" fill="#fff" />
        <circle cx="10.3" cy="8.7" r=".8" fill="#111" />
        <circle cx="13.7" cy="8.7" r=".8" fill="#111" />
        <path d="M9.4 11q2.6-1.6 5.2 0-2.6 2.4-5.2 0z" fill="#f5b301" />
        <ellipse cx="8" cy="26.2" rx="3.6" ry="1.5" fill="#f5b301" />
        <ellipse cx="16" cy="26.2" rx="3.6" ry="1.5" fill="#f5b301" />
      </svg>
    </span>
  </span>
</template>
