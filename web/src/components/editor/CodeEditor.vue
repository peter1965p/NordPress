<script setup>
// Monaco für den Code-Block. Wächst mit dem Inhalt (8 bis 40 Zeilen), Hell/Dunkel folgt dem Admin.
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import monaco, { monacoSprache } from '../../bloecke/monaco.js'

const quelle = defineModel({ type: String, required: true })
const props = defineProps({ sprache: { type: String, default: 'plaintext' }, fokus: Boolean })
const kasten = ref(null)
let editor = null
let beobachter = null

const thema = () => (document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs')

onMounted(() => {
  editor = monaco.editor.create(kasten.value, {
    value: quelle.value,
    language: monacoSprache(props.sprache),
    theme: thema(),
    automaticLayout: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 13,
    tabSize: 2,
    wordWrap: 'off',
    renderLineHighlight: 'line',
    scrollbar: { alwaysConsumeMouseWheel: false },
    padding: { top: 10, bottom: 10 },
  })
  const zeile = editor.getOption(monaco.editor.EditorOption.lineHeight)
  const hoehe = () => {
    const h = Math.min(Math.max(editor.getContentHeight(), zeile * 8 + 20), zeile * 40 + 20)
    kasten.value.style.height = `${h}px`
  }
  editor.onDidContentSizeChange(hoehe)
  hoehe()
  editor.onDidChangeModelContent(() => { quelle.value = editor.getValue() })
  if (props.fokus) editor.focus()
  // Admin-Umschalter Hell/Dunkel setzt die Klasse „dark“ am <html>
  beobachter = new MutationObserver(() => monaco.editor.setTheme(thema()))
  beobachter.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})

watch(() => props.sprache, s => editor && monaco.editor.setModelLanguage(editor.getModel(), monacoSprache(s)))
watch(quelle, q => { if (editor && q !== editor.getValue()) editor.setValue(q) })

onBeforeUnmount(() => {
  beobachter?.disconnect()
  editor?.dispose()
})
</script>

<template>
  <div ref="kasten" class="w-full" />
</template>
