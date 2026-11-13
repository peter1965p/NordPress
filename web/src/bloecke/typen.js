// Blocktypen für den Editor: Name, Beschreibung, leerer Block. Das Schema dazu steht in api/src/lib/bloecke.js.
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { generateHTML } from '@tiptap/vue-3'
import { erweiterungen } from './tiptap.js'

export const neueId = () => crypto.randomUUID().replaceAll('-', '').slice(0, 10)

export const TYPEN = {
  text: { name: 'Text', info: 'Fließtext mit Überschriften, Listen, Links', icon: 'beitrag', leer: () => ({ doc: { type: 'doc', content: [{ type: 'paragraph' }] } }) },
  hero: { name: 'Hero', info: 'Großer Kopfbereich mit Titel, Bild und Buttons', icon: 'medien', leer: () => ({ variante: 'hintergrund', titel: 'Überschrift', abdunkeln: 40, ausrichtung: 'mitte', buttons: [] }) },
  buttons: { name: 'Buttons', info: 'Leiste mit bis zu 4 Buttons', icon: 'extern', leer: () => ({ ausrichtung: 'mitte', hintergrund: 'hell', eintraege: [{ text: 'Jetzt anfragen', link: '#', stil: 'primaer' }] }) },
  iconliste: { name: 'Icon-Liste', info: 'Vorteile, Leistungen, Fakten mit Icons', icon: 'haken', leer: () => ({ titel: 'Unsere Vorteile', spalten: 2, hintergrund: 'standard', eintraege: [{ icon: 'haken', text: 'Erster Punkt' }] }) },
  karten: { name: 'Karten', info: 'Leistungen oder Funktionen als Kacheln mit Icon, Titel, Text', icon: 'stern', leer: () => ({ titel: 'Was wir bieten', spalten: 3, hintergrund: 'standard', eintraege: [{ icon: 'rakete', titel: 'Erste Karte', text: '' }] }) },
  beitraege: { name: 'Neueste Beiträge', info: 'Die letzten Beiträge als Kacheln, aktualisiert sich selbst', icon: 'beitrag', leer: () => ({ titel: 'Neu im Blog', anzahl: 3 }) },
  formular: { name: 'Formular', info: 'Kontakt, Anfrage, Bewerbung: ein Formular aus „Formulare“ einbinden', icon: 'formular', leer: () => ({ formular_id: null, titel: '', hintergrund: 'standard' }) },
  code: { name: 'Code', info: 'Quelltext mit Syntaxfarben (Monaco), wird nur angezeigt', icon: 'code', leer: () => ({ sprache: 'javascript', quelle: '' }) },
  markdown: { name: 'Markdown', info: 'Text in Markdown-Schreibweise', icon: 'stift', leer: () => ({ quelle: '' }) },
}

// Standardwerte wie auf dem Server. Ergänzt fehlende Felder beim Laden, damit Formulare nichts Leeres zeigen.
const STANDARD = {
  hero: { variante: 'hintergrund', abdunkeln: 40, ausrichtung: 'mitte', buttons: [] },
  buttons: { ausrichtung: 'mitte', hintergrund: 'standard' },
  iconliste: { spalten: 2, hintergrund: 'standard' },
  code: { sprache: 'plaintext' },
  karten: { spalten: 3, hintergrund: 'standard' },
  beitraege: { anzahl: 3 },
  formular: { hintergrund: 'standard' },
}
export const ergaenzt = bloecke => bloecke.map(b => ({ ...STANDARD[b.typ], ...b }))

export const neuerBlock = typ => ({ id: neueId(), typ, ...TYPEN[typ].leer() })

// Gleiche Liste wie SPRACHEN in api/src/lib/bloecke.js
export const SPRACHEN = { plaintext: 'Text', javascript: 'JavaScript', typescript: 'TypeScript', json: 'JSON', html: 'HTML', css: 'CSS',
  scss: 'SCSS', sql: 'SQL', python: 'Python', shell: 'Shell', powershell: 'PowerShell', yaml: 'YAML', markdown: 'Markdown', php: 'PHP',
  java: 'Java', csharp: 'C#', go: 'Go', rust: 'Rust', xml: 'XML', dockerfile: 'Dockerfile', ini: 'INI' }
export const bekannteSprache = s => (s in SPRACHEN ? s : 'plaintext')

export const HINTERGRUENDE = { standard: 'Ohne', hell: 'Hell', sand: 'Fläche (Theme)', akzent: 'Akzent (Theme)', dunkel: 'Dunkel' }
export const STILE = { primaer: 'Primär', sekundaer: 'Sekundär', umriss: 'Umriss', whatsapp: 'WhatsApp' }

// Live-Vorschau: macht aus der Quelle dieselbe Form, die die Liefer-API ausgibt (api/src/lib/bloecke.js, RENDER).
// Standardwerte müssen mit dem Server übereinstimmen.
const knopfListe = l => (l || []).map(b => ({ text: b.text, link: b.link, stil: b.stil || 'primaer', neues_fenster: !!b.neues_fenster }))

export function alsVorschau(bloecke, bilder) {
  return bloecke.map(b => {
    const basis = { id: b.id, typ: b.typ }
    switch (b.typ) {
      case 'markdown': return { ...basis, html: DOMPurify.sanitize(marked.parse(b.quelle || '')) }
      case 'text': return { ...basis, html: DOMPurify.sanitize(generateHTML(b.doc, erweiterungen())) }
      case 'hero': return {
        ...basis, variante: b.variante || 'hintergrund', eyebrow: b.eyebrow, untertitel: b.untertitel, text: b.text, hinweis: b.hinweis,
        titel_html: DOMPurify.sanitize(marked.parseInline(b.titel || ''), { ALLOWED_TAGS: ['em', 'strong'], ALLOWED_ATTR: [] }),
        bild: b.bild_id ? bilder.get(b.bild_id) || null : null,
        abdunkeln: b.abdunkeln ?? 40, ausrichtung: b.ausrichtung || 'mitte', buttons: knopfListe(b.buttons),
        ...(b.deko && b.deko !== 'keine' ? { deko: b.deko } : {}),
      }
      case 'code': return { ...basis, sprache: b.sprache || 'plaintext', ...(b.dateiname ? { dateiname: b.dateiname } : {}), quelle: b.quelle }
      case 'buttons': return { ...basis, ausrichtung: b.ausrichtung || 'mitte', hintergrund: b.hintergrund || 'standard', eintraege: knopfListe(b.eintraege) }
      case 'iconliste': return {
        ...basis, titel: b.titel, spalten: b.spalten || 2, hintergrund: b.hintergrund || 'standard',
        eintraege: (b.eintraege || []).map(e => ({ icon: e.icon || 'punkt', text: e.text })),
      }
      case 'karten': return {
        ...basis, titel: b.titel, untertitel: b.untertitel, spalten: b.spalten || 3, hintergrund: b.hintergrund || 'standard',
        eintraege: (b.eintraege || []).map(e => ({ icon: e.icon || 'punkt', titel: e.titel, text: e.text, link: e.link || undefined, formular_id: e.formular_id || undefined })),
      }
      case 'beitraege': return { ...basis, titel: b.titel, anzahl: b.anzahl || 3, kategorie: b.kategorie || undefined }
      case 'formular': return { ...basis, formular_id: b.formular_id ?? null, titel: b.titel || undefined, text: b.text || undefined, hintergrund: b.hintergrund || 'standard' }
      default: return basis
    }
  })
}

// Text-Block ohne Inhalt (z. B. nur ein leerer Absatz): auf der Website nicht zeigen. Gleiche Regel in api/src/lib/seo.js
export const istLeer = b => (b.typ === 'text' || b.typ === 'markdown') && !String(b.html || '').replace(/<[^>]*>|&nbsp;/g, '').trim() && !/<(img|hr|pre)/.test(b.html || '')

// Vor dem Speichern: leere optionale Felder weglassen, die das Schema sonst ablehnt (z. B. Link "" passt nicht aufs Muster)
const ohneLeer = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v !== undefined && v !== null))
export const zumSpeichern = bloecke => bloecke.map(b => {
  if (b.typ === 'karten') return { ...b, eintraege: b.eintraege.map(ohneLeer) }
  if (b.typ === 'beitraege' || b.typ === 'formular') return ohneLeer(b)
  return b
})
