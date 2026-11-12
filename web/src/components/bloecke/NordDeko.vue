<script setup>
// Deko „Norden“ für den Hero ohne Bild: Leuchtturm mit schwenkendem Lichtkegel, Möwen, Wellen.
// Reines SVG in der Akzentfarbe, keine Bilder. Die Bewegung ruht bei „Bewegung reduzieren“.
</script>

<template>
  <div aria-hidden="true" class="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
    <!-- Leuchtturm rechts, auf schmalen Flächen kleiner und blasser -->
    <svg viewBox="0 0 400 420" overflow="visible" class="overflow-visible absolute right-[-4rem] bottom-10 h-[85%] opacity-40 @3xl:right-[6%] @3xl:opacity-100">
      <defs>
        <linearGradient id="np-kegel" x1="1" x2="0">
          <stop offset="0" stop-color="#fff6c8" stop-opacity=".6" />
          <stop offset=".75" stop-color="#fff6c8" stop-opacity="0" />
        </linearGradient>
        <radialGradient id="np-schein">
          <stop offset="0" stop-color="#ffe9a0" stop-opacity=".9" />
          <stop offset="1" stop-color="#ffe9a0" stop-opacity="0" />
        </radialGradient>
      </defs>
      <!-- Lichtkegel nach links und rechts -->
      <g class="np-leuchtfeuer">
        <path d="M200 112 L-260 30 L-260 200 Z" fill="url(#np-kegel)" />
      </g>
      <circle cx="200" cy="112" r="60" fill="url(#np-schein)" class="np-blinken" />
      <!-- Turm -->
      <path d="M176 140 h48 l14 250 h-76 z" fill="#f8fafc" />
      <path d="M178.5 186 h43 l2.8 50 h-48.6 z M173 284 h54 l2.8 50 h-59.6 z" class="fill-akzent" />
      <path d="M176 140 h48 l14 250 h-38 z" fill="#0f172a" opacity=".08" />
      <!-- Laterne und Galerie -->
      <rect x="168" y="132" width="64" height="10" rx="2" fill="#e2e8f0" />
      <rect x="182" y="96" width="36" height="36" rx="3" fill="#1e293b" />
      <rect x="188" y="102" width="24" height="24" rx="2" fill="#ffe9a0" />
      <path d="M176 96 L200 72 L224 96 Z" class="fill-akzent" />
      <rect x="198" y="62" width="4" height="12" rx="2" fill="#e2e8f0" />
      <!-- Felsen -->
      <path d="M120 400 q30 -26 70 -14 q30 -18 66 -4 q34 2 54 18 z" fill="#0b1020" opacity=".7" />
    </svg>

    <!-- Möwen -->
    <svg viewBox="0 0 200 80" class="np-moewen absolute top-[14%] right-[30%] w-40 text-white/70">
      <path d="M10 40 q12 -10 24 2 q12 -12 24 -2" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
      <path d="M90 22 q9 -8 18 1 q9 -9 18 -1" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
      <path d="M150 50 q7 -6 14 1 q7 -7 14 -1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </svg>

    <!-- Wellen: drei Lagen, die vorderste in der Farbe der Seite -->
    <svg viewBox="0 0 1440 120" preserveAspectRatio="none" class="absolute bottom-0 left-0 h-20 w-[200%] np-wellen @3xl:h-28">
      <path d="M0 60 q90 -40 180 0 t180 0 t180 0 t180 0 t180 0 t180 0 t180 0 t180 0 V120 H0 z" class="fill-akzent" opacity=".35" />
    </svg>
    <svg viewBox="0 0 1440 120" preserveAspectRatio="none" class="absolute bottom-0 left-[-50%] h-16 w-[200%] np-wellen-langsam @3xl:h-20">
      <path d="M0 70 q120 -36 240 0 t240 0 t240 0 t240 0 t240 0 t240 0 V120 H0 z" fill="#ffffff" opacity=".12" />
    </svg>
    <svg viewBox="0 0 1440 60" preserveAspectRatio="none" class="absolute -bottom-px left-0 h-8 w-full @3xl:h-12">
      <path d="M0 30 q180 -28 360 0 t360 0 t360 0 t360 0 V60 H0 z" class="fill-white dark:fill-gray-900" />
    </svg>
  </div>
</template>
