<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { admin, sitzung } from '../../api.js'

const route = useRoute()
const router = useRouter()
const email = ref('')
const passwort = ref('')
const fehler = ref('')
const laeuft = ref(false)

async function anmelden() {
  fehler.value = ''
  laeuft.value = true
  try {
    await admin.post('/login', { email: email.value, password: passwort.value })
    sitzung.benutzer = await admin.get('/me')
    sitzung.geprueft = true
    router.replace(String(route.query.weiter || '/admin'))
  } catch (e) {
    fehler.value = e.message
  } finally {
    laeuft.value = false
  }
}
</script>

<template>
  <div class="flex min-h-dvh">
    <div class="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6">
      <div class="mx-auto w-full max-w-sm">
        <div class="mb-10 flex items-center gap-3">
          <img src="/favicon.svg" alt="" class="size-9" />
          <span class="text-xl font-bold text-gray-800 dark:text-gray-100">NordPress</span>
        </div>
        <h1 class="mb-6 text-3xl font-bold">Moin! ✨</h1>
        <form class="space-y-4" @submit.prevent="anmelden">
          <div>
            <label class="etikett" for="email">E-Mail</label>
            <input id="email" v-model="email" class="feld" type="email" autocomplete="username" required />
          </div>
          <div>
            <label class="etikett" for="pw">Passwort</label>
            <input id="pw" v-model="passwort" class="feld" type="password" autocomplete="current-password" required />
          </div>
          <p v-if="fehler" class="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{{ fehler }}</p>
          <button class="knopf-haupt w-full" :disabled="laeuft">{{ laeuft ? 'Prüfe …' : 'Anmelden' }}</button>
        </form>
      </div>
    </div>
    <div class="relative hidden flex-1 overflow-hidden bg-gray-900 md:block">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(132,112,255,.45),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(56,189,248,.25),transparent_40%)]" />
      <div class="absolute inset-x-12 bottom-12 text-gray-300">
        <p class="text-2xl font-semibold text-white">Headless. Schnell. Aus dem Norden.</p>
        <p class="mt-2 text-sm text-gray-400">Inhalte pflegen hier, ausliefern überall: per REST-API unter <code class="text-violet-300">/api/v1</code>.</p>
      </div>
    </div>
  </div>
</template>
