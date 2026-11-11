<script setup>
// TipTap für den Textblock. Gespeichert wird TipTap-JSON, der Server macht daraus geprüftes HTML.
// Code öffnet Monaco: ``` + Enter, der Knopf „Code“ oder Einfügen von erkanntem Code (mit Rückfrage).
// Dafür wird der Textblock an der Stelle geteilt: Text davor bleibt, dann der Code-Block, dann der Rest als neuer Textblock.
import { ref } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { erweiterungen, LINK_OK } from '../../bloecke/tiptap.js'
import { erkenneCode } from '../../bloecke/codeerkennung.js'
import { SPRACHEN, bekannteSprache } from '../../bloecke/typen.js'

const doc = defineModel({ type: Object, required: true })
const emit = defineEmits(['als-code'])
const vorschlag = ref(null)   // { quelle, sprache, text } solange die Rückfrage offen ist

const ZAUN_ZEILE = /^```([\w+#-]*)$/

// Schneidet alles ab dem aktuellen Absatz ab und meldet Code plus Rest nach oben.
// entfernen: der aktuelle Absatz fällt weg (er enthielt ``` oder war leer), sonst bleibt er vor dem Code stehen.
function teilen(view, code, entfernen) {
  const { state } = view
  const { $from } = state.selection
  entfernen = entfernen && $from.depth === 1   // in Listen und Zitaten nie die ganze Liste entfernen
  const ab = entfernen ? $from.before(1) : $from.after(1)
  const rest = state.doc.slice(entfernen ? $from.after(1) : ab, state.doc.content.size).content.toJSON() || []
  view.dispatch(state.tr.delete(ab, state.doc.content.size))
  emit('als-code', { ...code, rest })
}

const editor = useEditor({
  content: doc.value,
  extensions: erweiterungen(),
  editorProps: {
    attributes: {
      class: 'prose prose-gray max-w-none min-h-40 px-5 py-4 focus:outline-none dark:prose-invert prose-a:text-violet-500',
    },
    handleKeyDown(view, e) {
      if (e.key !== 'Enter' || e.shiftKey) return false
      const { $from } = view.state.selection
      const absatz = $from.parent
      const z = $from.depth === 1 && absatz.type.name === 'paragraph' && absatz.textContent.trim().match(ZAUN_ZEILE)
      if (!z) return false
      teilen(view, { quelle: '', sprache: bekannteSprache(z[1] || 'javascript') }, true)
      return true
    },
    handlePaste(view, e) {
      const text = e.clipboardData?.getData('text/plain')
      const r = erkenneCode(text)
      if (!r) return false
      vorschlag.value = { quelle: r.quelle, sprache: bekannteSprache(r.sprache), text }
      return true
    },
  },
  onUpdate: ({ editor: ed }) => { doc.value = ed.getJSON() },
})

function alsCode() {
  const view = editor.value.view
  const leer = view.state.selection.$from.parent.textContent.trim() === ''
  teilen(view, { quelle: vorschlag.value.quelle, sprache: vorschlag.value.sprache }, leer)
  vorschlag.value = null
}

function alsText() {
  const zeilen = vorschlag.value.text.replace(/\r\n/g, '\n').split('\n')
  editor.value.chain().focus().insertContent(zeilen.map(z => ({ type: 'paragraph', content: z ? [{ type: 'text', text: z }] : [] }))).run()
  vorschlag.value = null
}

function codeKnopf() {
  const view = editor.value.view
  teilen(view, { quelle: '', sprache: 'javascript' }, view.state.selection.$from.parent.textContent.trim() === '')
}

function link() {
  const e = editor.value
  const alt = e.getAttributes('link').href || ''
  const neu = window.prompt('Link-Adresse (https://…, mailto:…, /seite/… oder #anker). Leer = Link entfernen', alt)
  if (neu === null) return
  if (!neu.trim()) return e.chain().focus().extendMarkRange('link').unsetLink().run()
  if (!LINK_OK.test(neu.trim())) return window.alert('Erlaubt sind https://, http://, mailto:, /pfad und #anker.')
  e.chain().focus().extendMarkRange('link').setLink({ href: neu.trim() }).run()
}

const LEISTE = [
  ['B', 'Fett (Strg+B)', c => c.toggleBold(), 'bold', 'font-bold'],
  ['I', 'Kursiv (Strg+I)', c => c.toggleItalic(), 'italic', 'italic'],
  ['S', 'Durchgestrichen', c => c.toggleStrike(), 'strike', 'line-through'],
  ['</>', 'Code im Text', c => c.toggleCode(), 'code', 'font-mono'],
  null,
  ['H2', 'Überschrift 2', c => c.toggleHeading({ level: 2 }), ['heading', { level: 2 }]],
  ['H3', 'Überschrift 3', c => c.toggleHeading({ level: 3 }), ['heading', { level: 3 }]],
  ['H4', 'Überschrift 4', c => c.toggleHeading({ level: 4 }), ['heading', { level: 4 }]],
  null,
  ['• Liste', 'Aufzählung', c => c.toggleBulletList(), 'bulletList'],
  ['1. Liste', 'Nummerierte Liste', c => c.toggleOrderedList(), 'orderedList'],
  ['„ Zitat', 'Zitat', c => c.toggleBlockquote(), 'blockquote'],
  ['—', 'Trennlinie', c => c.setHorizontalRule(), null],
]
const aktiv = a => (a ? (Array.isArray(a) ? editor.value?.isActive(...a) : editor.value?.isActive(a)) : false)
const tun = f => f(editor.value.chain().focus()).run()
const KNOPF = 'rounded px-2 py-1 text-xs font-medium'
const AUS = 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700/50'
const AN = 'bg-violet-500/15 text-violet-600 dark:text-violet-400'
</script>

<template>
  <div v-if="editor" class="relative">
    <div class="flex flex-wrap items-center gap-0.5 border-b border-gray-100 px-3 py-1.5 dark:border-gray-700/60">
      <template v-for="(k, i) in LEISTE" :key="i">
        <span v-if="!k" class="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" />
        <button v-else type="button" :title="k[1]" :class="[KNOPF, aktiv(k[3]) ? AN : AUS, k[4]]" @click="tun(k[2])">{{ k[0] }}</button>
      </template>
      <span class="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" />
      <button type="button" title="Link (markierten Text verlinken)" :class="[KNOPF, aktiv('link') ? AN : AUS]" @click="link">Link</button>
      <button type="button" title="Code-Block mit Monaco einfügen (oder ``` und Enter tippen)" :class="[KNOPF, AUS, 'font-mono']" @click="codeKnopf">{ } Code</button>
      <span class="ml-auto flex gap-0.5">
        <button type="button" title="Rückgängig (Strg+Z)" :class="[KNOPF, AUS, 'disabled:opacity-30']" :disabled="!editor.can().undo()" @click="tun(c => c.undo())">↶</button>
        <button type="button" title="Wiederholen (Strg+Y)" :class="[KNOPF, AUS, 'disabled:opacity-30']" :disabled="!editor.can().redo()" @click="tun(c => c.redo())">↷</button>
      </span>
    </div>

    <!-- Rückfrage nach dem Einfügen von Code -->
    <div v-if="vorschlag" class="flex flex-wrap items-center gap-3 border-b border-violet-200 bg-violet-50 px-4 py-2.5 text-sm dark:border-violet-500/30 dark:bg-violet-500/10">
      <span class="text-gray-700 dark:text-gray-200">Das sieht nach Code aus.</span>
      <select v-model="vorschlag.sprache" class="feld w-36 py-1">
        <option v-for="(n, s) in SPRACHEN" :key="s" :value="s">{{ n }}</option>
      </select>
      <button type="button" class="knopf-akzent py-1" @click="alsCode">Als Code-Block einfügen</button>
      <button type="button" class="knopf-rand py-1" @click="alsText">Als Text einfügen</button>
      <button type="button" class="ml-auto text-gray-400 hover:text-gray-600" title="Verwerfen" @click="vorschlag = null">✕</button>
    </div>

    <EditorContent :editor="editor" />
  </div>
</template>
