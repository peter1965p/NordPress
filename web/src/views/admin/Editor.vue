<script setup>
import { computed, provide, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '../../components/Icon.vue'
import MedienWahl from '../../components/MedienWahl.vue'
import BlockAnzeige from '../../components/bloecke/BlockAnzeige.vue'
import ThemeRahmen from '../../components/ThemeRahmen.vue'
import BlockEditor from '../../components/editor/BlockEditor.vue'
import { alsVorschau, ergaenzt, neuerBlock, zumSpeichern } from '../../bloecke/typen.js'
import { admin, darf, datum, melde, oeffentlich } from '../../api.js'

const props = defineProps({ typ: { type: String, required: true }, id: { type: String, required: true } })
const router = useRouter()
const seite = computed(() => props.typ === 'page')
const neu = computed(() => props.id === 'neu')

const leer = () => ({ title: '', slug: '', excerpt: '', blocks: [neuerBlock('text')], status: 'draft', featured_media_id: null, featured_media_url: null, menu_order: 0, term_ids: [], seo_titel: '', seo_beschreibung: '', noindex: false })
const b = ref(leer())
const kategorien = ref([])
const schlagwoerter = ref([])
const neuesTag = ref('')
const ansicht = ref('schreiben')
const waehlen = ref(false)
const speichert = ref(false)
const geaendert = ref(false)
// Bilder der Mediathek (ID -> Adresse), für Hero-Bilder in Formular und Vorschau
const bilder = reactive(new Map())
provide('bilder', bilder)
// Die Vorschau zeigt die Blöcke im Theme der Website
const theme = ref(null)
const seitenTitel = ref('')
oeffentlich('/settings').then(e => { theme.value = e.theme; seitenTitel.value = e.title }).catch(() => {})

async function laden() {
  const [k, t] = await Promise.all([admin.get('/terms?taxonomy=category'), admin.get('/terms?taxonomy=tag')])
  kategorien.value = k.items
  schlagwoerter.value = t.items
  const [eintrag, medien] = await Promise.all([neu.value ? leer() : admin.get(`/posts/${props.id}`), admin.get('/media')])
  bilder.clear()
  for (const m of medien.items) bilder.set(m.id, { url: m.url, alt: m.alt })
  b.value = { ...eintrag, blocks: ergaenzt(eintrag.blocks || []) }
  geaendert.value = false
}
watch(() => props.id, laden, { immediate: true })
watch(b, () => { geaendert.value = true }, { deep: true, flush: 'sync' })

const vorschau = computed(() => alsVorschau(b.value.blocks, bilder))
const woerter = computed(() => vorschau.value.filter(v => v.html).map(v => v.html.replace(/<[^>]+>/g, ' ')).join(' ').match(/\S+/g)?.length || 0)
const pfad = computed(() => `/${seite.value ? 'seite' : 'beitrag'}/`)

// So erscheint der Eintrag bei Google. Gleiche Regeln wie auf dem Server (api/src/routes/seite.js)
const kuerzen = (t, max) => { t = t.replace(/\s+/g, ' ').trim(); return t.length <= max ? t : t.slice(0, max - 1).replace(/\s+\S*$/, '') + ' …' }
const snippet = computed(() => {
  const text = b.value.seo_beschreibung || b.value.excerpt || vorschau.value.map(v => (v.html || [v.untertitel, v.text].filter(Boolean).join('. ')).replace(/<[^>]+>/g, ' ')).join(' ')
  return {
    titel: kuerzen(b.value.seo_titel || [b.value.title || 'Ohne Titel', seitenTitel.value].filter(Boolean).join(' · '), 60),
    adresse: `${location.host}${pfad.value}${b.value.slug || 'adresse'}`,
    text: kuerzen(text, 160) || 'Noch keine Beschreibung. Google nimmt dann irgendeinen Text von der Seite.',
  }
})

function umschalten(liste, id) {
  const i = liste.indexOf(id)
  i === -1 ? liste.push(id) : liste.splice(i, 1)
}

async function tagAnlegen() {
  const name = neuesTag.value.trim()
  if (!name) return
  const vorhanden = schlagwoerter.value.find(t => t.name.toLowerCase() === name.toLowerCase())
  const t = vorhanden || await admin.post('/terms', { taxonomy: 'tag', name })
  if (!vorhanden) schlagwoerter.value.push(t)
  if (!b.value.term_ids.includes(t.id)) b.value.term_ids.push(t.id)
  neuesTag.value = ''
}

async function speichern(status = b.value.status) {
  speichert.value = true
  const daten = {
    title: b.value.title, slug: b.value.slug, excerpt: b.value.excerpt, blocks: zumSpeichern(b.value.blocks), status,
    featured_media_id: b.value.featured_media_id, term_ids: b.value.term_ids,
    seo_titel: (b.value.seo_titel || '').trim(), seo_beschreibung: (b.value.seo_beschreibung || '').trim(), noindex: !!b.value.noindex,
    ...(seite.value ? { menu_order: Number(b.value.menu_order) || 0 } : {}),
  }
  try {
    if (neu.value) {
      const erg = await admin.post('/posts', { type: props.typ, ...daten })
      melde(status === 'published' ? 'Veröffentlicht' : 'Entwurf gespeichert')
      router.replace(`/admin/${seite.value ? 'seiten' : 'beitraege'}/${erg.id}`)
    } else {
      const erg = await admin.put(`/posts/${props.id}`, daten)
      b.value = { ...erg, blocks: ergaenzt(erg.blocks) }
      melde(status === 'published' ? 'Veröffentlicht' : 'Gespeichert')
      geaendert.value = false
    }
  } catch (e) {
    melde(e.message, 'fehler')
  } finally {
    speichert.value = false
  }
}

function bildGewaehlt(m) {
  b.value.featured_media_id = m.id
  b.value.featured_media_url = m.url
  waehlen.value = false
}

function tasten(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); speichern() }
}
</script>

<template>
  <div @keydown="tasten">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <RouterLink :to="`/admin/${seite ? 'seiten' : 'beitraege'}`" class="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-violet-500">
        <Icon name="pfeil" klasse="size-4" /> {{ seite ? 'Alle Seiten' : 'Alle Beiträge' }}
      </RouterLink>
      <div class="flex items-center gap-2">
        <span v-if="geaendert" class="text-xs text-amber-500">Nicht gespeichert</span>
        <a v-if="!neu && b.status === 'published'" :href="pfad + b.slug" target="_blank" class="knopf-rand"><Icon name="auge" klasse="size-4" /> Ansehen</a>
      </div>
    </div>

    <div class="grid gap-6 xl:grid-cols-[1fr_20rem]">
      <!-- Hauptspalte -->
      <div class="space-y-6">
        <div class="karte p-5">
          <input v-model="b.title" class="w-full border-0 bg-transparent p-0 text-2xl font-bold text-gray-800 placeholder:text-gray-300 focus:ring-0 focus:outline-none md:text-3xl dark:text-gray-100 dark:placeholder:text-gray-600" placeholder="Titel" />
          <div class="mt-2 flex items-center gap-1 font-mono text-xs text-gray-400">
            <span>{{ pfad }}</span>
            <input v-model="b.slug" class="min-w-0 flex-1 border-0 bg-transparent p-0 font-mono text-xs text-gray-500 focus:ring-0 focus:outline-none" placeholder="wird-aus-dem-titel-erzeugt" />
          </div>
        </div>

        <div class="flex items-center justify-between">
          <div class="flex gap-1">
            <button v-for="a in [['schreiben', 'Bearbeiten'], ['vorschau', 'Vorschau'], ['geteilt', 'Geteilt']]" :key="a[0]"
              class="rounded-md px-3 py-1.5 text-sm font-medium"
              :class="ansicht === a[0] ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
              @click="ansicht = a[0]">{{ a[1] }}</button>
          </div>
          <span class="text-xs text-gray-400">{{ b.blocks.length }} Blöcke · {{ woerter }} Wörter</span>
        </div>
        <div class="grid items-start gap-6" :class="ansicht === 'geteilt' ? '2xl:grid-cols-2' : ''">
          <BlockEditor v-show="ansicht !== 'vorschau'" v-model="b.blocks" />
          <!-- Vorschau mit denselben Komponenten wie die Website -->
          <div v-show="ansicht !== 'schreiben'" class="karte sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto bg-white dark:bg-gray-900">
            <ThemeRahmen :theme="theme" class="min-h-full bg-white dark:bg-gray-900">
              <BlockAnzeige :bloecke="vorschau" />
            </ThemeRahmen>
            <p v-if="!b.blocks.length" class="p-10 text-center text-sm text-gray-400">Noch keine Blöcke.</p>
          </div>
        </div>

        <div class="karte p-5">
          <label class="etikett">Auszug</label>
          <textarea v-model="b.excerpt" rows="3" class="feld" placeholder="Kurzfassung für Übersichten und Vorschauen" />
        </div>

        <div class="karte space-y-4 p-5">
          <h3 class="text-sm font-semibold">Suchmaschinen</h3>
          <!-- Vorschau wie in den Google-Ergebnissen -->
          <div class="rounded-lg border border-gray-200 bg-white p-4 font-sans dark:border-gray-700 dark:bg-gray-900/40">
            <div class="truncate text-xs text-gray-500">{{ snippet.adresse }}</div>
            <div class="truncate text-lg leading-snug text-[#1a0dab] dark:text-[#8ab4f8]">{{ snippet.titel }}</div>
            <div class="line-clamp-2 text-sm text-gray-600 dark:text-gray-400">{{ snippet.text }}</div>
          </div>
          <div>
            <label class="etikett flex justify-between">SEO-Titel <span class="font-normal" :class="(b.seo_titel || '').length > 60 ? 'text-amber-500' : 'text-gray-400'">{{ (b.seo_titel || '').length }} / 60</span></label>
            <input v-model="b.seo_titel" class="feld" maxlength="120" :placeholder="`${b.title || 'Titel'} · ${seitenTitel}`" />
          </div>
          <div>
            <label class="etikett flex justify-between">Beschreibung <span class="font-normal" :class="(b.seo_beschreibung || '').length > 160 ? 'text-amber-500' : 'text-gray-400'">{{ (b.seo_beschreibung || '').length }} / 160</span></label>
            <textarea v-model="b.seo_beschreibung" rows="2" class="feld" maxlength="300" placeholder="Leer: Auszug oder Anfang des Textes. Am besten 1–2 Sätze, die neugierig machen." />
          </div>
          <label class="flex items-center gap-2 text-sm">
            <input v-model="b.noindex" type="checkbox" class="size-4 rounded accent-violet-500" />
            Nicht in Suchmaschinen aufnehmen (z. B. Impressum, Danke-Seite)
          </label>
        </div>
      </div>

      <!-- Seitenleiste -->
      <div class="space-y-6">
        <div class="karte p-5">
          <h3 class="mb-3 text-sm font-semibold">Veröffentlichen</h3>
          <dl class="mb-4 space-y-1 text-sm">
            <div class="flex justify-between"><dt>Status</dt>
              <dd class="font-medium" :class="b.status === 'published' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'">{{ b.status === 'published' ? 'Online' : 'Entwurf' }}</dd></div>
            <div v-if="b.published_at" class="flex justify-between"><dt>Seit</dt><dd>{{ datum(b.published_at, true) }}</dd></div>
            <div v-if="b.author_name" class="flex justify-between"><dt>Autor</dt><dd>{{ b.author_name }}</dd></div>
          </dl>
          <div class="flex flex-col gap-2">
            <button v-if="b.status !== 'published'" class="knopf-akzent" :disabled="speichert || !b.title" @click="speichern('published')">Veröffentlichen</button>
            <button class="knopf-haupt" :disabled="speichert || !b.title" @click="speichern()">{{ b.status === 'published' ? 'Aktualisieren' : 'Entwurf speichern' }}</button>
            <button v-if="b.status === 'published'" class="knopf-rand" :disabled="speichert" @click="speichern('draft')">Zurück auf Entwurf</button>
          </div>
          <p class="mt-3 text-center text-xs text-gray-400">Strg + S speichert</p>
        </div>

        <div class="karte p-5">
          <h3 class="mb-3 text-sm font-semibold">Beitragsbild</h3>
          <div v-if="b.featured_media_url" class="space-y-2">
            <img :src="b.featured_media_url" alt="" class="aspect-video w-full rounded-lg object-cover" />
            <button class="text-sm font-medium text-red-500" @click="b.featured_media_id = null; b.featured_media_url = null">Entfernen</button>
          </div>
          <button v-else class="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-gray-200 py-6 text-sm text-gray-400 hover:border-violet-300 hover:text-violet-500 dark:border-gray-700" @click="waehlen = true">
            <Icon name="medien" klasse="size-6" /> Bild wählen
          </button>
        </div>

        <div v-if="seite" class="karte p-5">
          <label class="etikett">Reihenfolge im Menü</label>
          <input v-model="b.menu_order" type="number" class="feld" />
        </div>

        <template v-else>
          <div class="karte p-5">
            <h3 class="mb-3 text-sm font-semibold">Kategorien</h3>
            <ul class="max-h-48 space-y-2 overflow-y-auto">
              <li v-for="k in kategorien" :key="k.id">
                <label class="flex items-center gap-2 text-sm">
                  <input type="checkbox" class="size-4 rounded accent-violet-500" :checked="b.term_ids.includes(k.id)" @change="umschalten(b.term_ids, k.id)" />
                  {{ k.name }}
                </label>
              </li>
              <li v-if="!kategorien.length" class="text-sm text-gray-400">
                Noch keine. <RouterLink v-if="darf('editor')" to="/admin/kategorien" class="text-violet-500">Anlegen</RouterLink>
              </li>
            </ul>
          </div>
          <div class="karte p-5">
            <h3 class="mb-3 text-sm font-semibold">Schlagwörter</h3>
            <div class="mb-3 flex flex-wrap gap-1.5">
              <button v-for="t in schlagwoerter.filter(t => b.term_ids.includes(t.id))" :key="t.id"
                class="marke gap-1 bg-gray-100 text-gray-700 hover:bg-red-500/10 hover:text-red-500 dark:bg-gray-700/50 dark:text-gray-300"
                title="Entfernen" @click="umschalten(b.term_ids, t.id)">{{ t.name }} ×</button>
            </div>
            <form class="flex gap-2" @submit.prevent="tagAnlegen">
              <input v-model="neuesTag" list="tags" class="feld" placeholder="Hinzufügen …" />
              <datalist id="tags"><option v-for="t in schlagwoerter" :key="t.id" :value="t.name" /></datalist>
              <button class="knopf-rand"><Icon name="plus" klasse="size-4" /></button>
            </form>
          </div>
        </template>
      </div>
    </div>

    <MedienWahl v-if="waehlen" @gewaehlt="bildGewaehlt" @schliessen="waehlen = false" />
  </div>
</template>
