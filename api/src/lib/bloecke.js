// Blöcke: Schema je Typ (Prüfung beim Speichern), öffentliche Form (beim Speichern erzeugt) und Suchtext.
// Neue Blocktypen: Schema in TYPEN, Darstellung in RENDER, Text in TEXT.
import { bereinigeHtml, inlineZuHtml, markdownZuHtml } from './text.js'

// Links: http(s), mailto, tel, Pfad auf der eigenen Seite oder Anker. Kein javascript:, kein //fremd.de
const link = { type: 'string', maxLength: 500, pattern: '^(https?://|mailto:|tel:|/(?!/)|#)' }
const kurz = (max = 200) => ({ type: 'string', maxLength: max })
const bildId = { type: ['integer', 'null'], minimum: 1 }
const HINTERGRUENDE = ['standard', 'hell', 'sand', 'akzent', 'dunkel']
// Sprachen der Code-Blöcke, gleiche Liste in web/src/bloecke/typen.js
export const SPRACHEN = ['plaintext', 'javascript', 'typescript', 'json', 'html', 'css', 'scss', 'sql', 'python', 'shell',
  'powershell', 'yaml', 'markdown', 'php', 'java', 'csharp', 'go', 'rust', 'xml', 'dockerfile', 'ini']

const button = {
  type: 'object',
  required: ['text', 'link'],
  additionalProperties: false,
  properties: {
    text: { type: 'string', minLength: 1, maxLength: 80 },
    link,
    stil: { type: 'string', enum: ['primaer', 'sekundaer', 'umriss', 'whatsapp'] },
    neues_fenster: { type: 'boolean' },
  },
}
const buttons = { type: 'array', maxItems: 4, items: button }

// TipTap-JSON wird hier nur grob geprüft. Die eigentliche Sicherheit liefert der Renderer mit seiner Positivliste.
const tiptapDoc = {
  type: 'object',
  required: ['type'],
  properties: { type: { const: 'doc' }, content: { type: 'array', maxItems: 2000 } },
}

const block = (typ, properties, required = []) => ({
  type: 'object',
  required: ['id', 'typ', ...required],
  additionalProperties: false,
  properties: { id: { type: 'string', pattern: '^[A-Za-z0-9_-]{1,40}$' }, typ: { const: typ }, ...properties },
})

export const TYPEN = {
  markdown: block('markdown', { quelle: { type: 'string', maxLength: 200000 } }, ['quelle']),
  text: block('text', { doc: tiptapDoc }, ['doc']),
  hero: block('hero', {
    variante: { type: 'string', enum: ['hintergrund', 'geteilt', 'logo'] },   // logo: Bild ganz oben, Text darunter
    eyebrow: kurz(80),
    titel: { type: 'string', minLength: 1, maxLength: 200 },
    untertitel: kurz(200),
    text: kurz(1000),
    hinweis: kurz(500),
    bild_id: bildId,
    abdunkeln: { type: 'integer', minimum: 0, maximum: 90 },
    ausrichtung: { type: 'string', enum: ['links', 'mitte'] },
    deko: { type: 'string', enum: ['keine', 'norden'] },   // nur ohne Bild: Leuchtturm, Wellen, Möwen
    buttons,
  }, ['titel']),
  buttons: block('buttons', {
    ausrichtung: { type: 'string', enum: ['links', 'mitte'] },
    hintergrund: { type: 'string', enum: HINTERGRUENDE },
    eintraege: { ...buttons, minItems: 1 },
  }, ['eintraege']),
  // Code wird nur angezeigt, nie ausgeführt. Die Website gibt die Quelle als Text aus (kein HTML).
  code: block('code', {
    sprache: { type: 'string', enum: SPRACHEN },
    dateiname: kurz(120),
    quelle: { type: 'string', maxLength: 100000 },
  }, ['quelle']),
  // Karten: Leistungen, Vorteile, Funktionen mit Icon, Titel, Text und optionalem Link
  karten: block('karten', {
    titel: kurz(200),
    untertitel: kurz(300),
    spalten: { type: 'integer', minimum: 2, maximum: 4 },
    hintergrund: { type: 'string', enum: HINTERGRUENDE },
    eintraege: {
      type: 'array', minItems: 1, maxItems: 12,
      items: {
        type: 'object', required: ['titel'], additionalProperties: false,
        properties: {
          icon: { type: 'string', pattern: '^[a-z0-9-]{1,40}$' },
          titel: { type: 'string', minLength: 1, maxLength: 120 },
          text: kurz(600),
          link,
          formular_id: { type: ['integer', 'null'], minimum: 1 },   // Formular direkt in der Karte
        },
      },
    },
  }, ['eintraege']),
  // Neueste Beiträge: die Website holt sie beim Anzeigen über /api/v1/posts
  beitraege: block('beitraege', {
    titel: kurz(200),
    anzahl: { type: 'integer', enum: [3, 6, 9] },
    kategorie: { type: 'string', pattern: '^[a-z0-9-]{0,80}$' },
  }),
  // Formular: verweist auf ein Formular aus dem Admin. Die Website holt die Felder über /api/v1/forms/:id
  formular: block('formular', {
    formular_id: { type: ['integer', 'null'], minimum: 1 },
    titel: kurz(200),
    text: kurz(1000),
    hintergrund: { type: 'string', enum: HINTERGRUENDE },
  }),
  iconliste: block('iconliste', {
    titel: kurz(200),
    spalten: { type: 'integer', minimum: 1, maximum: 4 },
    hintergrund: { type: 'string', enum: HINTERGRUENDE },
    eintraege: {
      type: 'array', minItems: 1, maxItems: 40,
      items: {
        type: 'object', required: ['text'], additionalProperties: false,
        properties: { icon: { type: 'string', pattern: '^[a-z0-9-]{1,40}$' }, text: { type: 'string', minLength: 1, maxLength: 300 } },
      },
    },
  }, ['eintraege']),
}

export const bloeckeSchema = {
  type: 'array',
  maxItems: 100,
  items: { type: 'object', required: ['typ'], discriminator: { propertyName: 'typ' }, oneOf: Object.values(TYPEN) },
}

// ---------- TipTap-JSON zu HTML, nur bekannte Knoten und Marken ----------

const esc = s => String(s).replace(/[&<>"']/g, z => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[z])
const LINK_OK = /^(https?:\/\/|mailto:|\/(?!\/)|#)/i
const MAX_TIEFE = 20

function marken(text, marks = []) {
  let html = esc(text)
  for (const m of Array.isArray(marks) ? marks : []) {
    if (m?.type === 'bold') html = `<strong>${html}</strong>`
    else if (m?.type === 'italic') html = `<em>${html}</em>`
    else if (m?.type === 'strike') html = `<del>${html}</del>`
    else if (m?.type === 'code') html = `<code>${html}</code>`
    else if (m?.type === 'link' && LINK_OK.test(String(m.attrs?.href || ''))) html = `<a href="${esc(m.attrs.href)}">${html}</a>`
  }
  return html
}

function knoten(n, tiefe = 0) {
  if (!n || typeof n !== 'object' || tiefe > MAX_TIEFE) return ''
  const innen = () => (Array.isArray(n.content) ? n.content.map(k => knoten(k, tiefe + 1)).join('') : '')
  switch (n.type) {
    case 'doc': return innen()
    case 'text': return marken(n.text ?? '', n.marks)
    case 'paragraph': return `<p>${innen()}</p>`
    case 'heading': { const s = Math.min(4, Math.max(2, Number(n.attrs?.level) || 2)); return `<h${s}>${innen()}</h${s}>` }
    case 'bulletList': return `<ul>${innen()}</ul>`
    case 'orderedList': return `<ol>${innen()}</ol>`
    case 'listItem': return `<li>${innen()}</li>`
    case 'blockquote': return `<blockquote>${innen()}</blockquote>`
    case 'codeBlock': {
      const sprache = /^[a-z0-9+#-]{1,20}$/i.test(n.attrs?.language || '') ? ` class="language-${n.attrs.language}"` : ''
      const roh = (n.content || []).map(k => k?.text ?? '').join('')
      return `<pre><code${sprache}>${esc(roh)}</code></pre>`
    }
    case 'hardBreak': return '<br>'
    case 'horizontalRule': return '<hr>'
    default: return ''   // unbekannt: weglassen
  }
}

export const tiptapZuHtml = doc => bereinigeHtml(knoten(doc))

function tiptapText(n, tiefe = 0) {
  if (!n || typeof n !== 'object' || tiefe > MAX_TIEFE) return ''
  if (n.type === 'text') return String(n.text ?? '')
  return Array.isArray(n.content) ? n.content.map(k => tiptapText(k, tiefe + 1)).join(' ') : ''
}

// ---------- Öffentliche Form ----------

const ohneLeere = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined))
const buttonsOeffentlich = liste => (liste || []).map(b => ({ text: b.text, link: b.link, stil: b.stil || 'primaer', neues_fenster: !!b.neues_fenster }))

const RENDER = {
  markdown: b => ({ html: markdownZuHtml(b.quelle) }),
  text: b => ({ html: tiptapZuHtml(b.doc) }),
  hero: b => ohneLeere({
    variante: b.variante || 'hintergrund',
    eyebrow: b.eyebrow,
    titel_html: inlineZuHtml(b.titel),
    untertitel: b.untertitel,
    text: b.text,
    hinweis: b.hinweis,
    bild_id: b.bild_id ?? null,
    abdunkeln: b.abdunkeln ?? 40,
    ausrichtung: b.ausrichtung || 'mitte',
    deko: b.deko && b.deko !== 'keine' ? b.deko : undefined,
    buttons: buttonsOeffentlich(b.buttons),
  }),
  code: b => ohneLeere({ sprache: b.sprache || 'plaintext', dateiname: b.dateiname || undefined, quelle: b.quelle }),
  buttons: b => ({ ausrichtung: b.ausrichtung || 'mitte', hintergrund: b.hintergrund || 'standard', eintraege: buttonsOeffentlich(b.eintraege) }),
  karten: b => ohneLeere({
    titel: b.titel,
    untertitel: b.untertitel,
    spalten: b.spalten || 3,
    hintergrund: b.hintergrund || 'standard',
    eintraege: b.eintraege.map(e => ohneLeere({ icon: e.icon || 'punkt', titel: e.titel, text: e.text, link: e.link || undefined, formular_id: e.formular_id || undefined })),
  }),
  beitraege: b => ohneLeere({ titel: b.titel, anzahl: b.anzahl || 3, kategorie: b.kategorie || undefined }),
  formular: b => ohneLeere({ formular_id: b.formular_id ?? null, titel: b.titel || undefined, text: b.text || undefined, hintergrund: b.hintergrund || 'standard' }),
  iconliste: b => ohneLeere({
    titel: b.titel,
    spalten: b.spalten || 2,
    hintergrund: b.hintergrund || 'standard',
    eintraege: b.eintraege.map(e => ({ icon: e.icon || 'punkt', text: e.text })),
  }),
}

const TEXT = {
  markdown: b => b.quelle,
  text: b => tiptapText(b.doc),
  hero: b => [b.eyebrow, b.titel, b.untertitel, b.text].filter(Boolean).join(' '),
  buttons: () => '',
  code: b => [b.dateiname, b.quelle].filter(Boolean).join(' '),
  iconliste: b => [b.titel, ...b.eintraege.map(e => e.text)].filter(Boolean).join(' '),
  karten: b => [b.titel, b.untertitel, ...b.eintraege.flatMap(e => [e.titel, e.text])].filter(Boolean).join(' '),
  beitraege: b => b.titel || '',
  formular: b => [b.titel, b.text].filter(Boolean).join(' '),
}

// Liefert alles, was beim Speichern in die Datenbank geht.
export function verarbeite(bloecke) {
  const render = bloecke.map(b => ({ id: b.id, typ: b.typ, ...RENDER[b.typ](b) }))
  return {
    blocks: bloecke,
    blocks_render: render,
    // Für einfache Abnehmer (RSS, alte Frontends): nur die Textblöcke als ein HTML
    content_html: render.filter(r => r.html !== undefined).map(r => r.html).join('\n'),
    such_text: bloecke.map(b => TEXT[b.typ](b)).filter(Boolean).join('\n'),
    // Bisherige Oberfläche: Markdown nur, wenn der Inhalt genau ein Markdown-Block ist
    content: nurMarkdown(bloecke) && bloecke[0] ? bloecke[0].quelle : '',
  }
}

export const nurMarkdown = bloecke => bloecke.length === 0 || (bloecke.length === 1 && bloecke[0].typ === 'markdown')

export const ausMarkdown = quelle => (quelle ? [{ id: 'b1', typ: 'markdown', quelle }] : [])

// Bilder erst beim Abruf auflösen: ein gelöschtes Bild hinterlässt so keinen toten Link.
export function bildIds(render) {
  return render.filter(r => r.bild_id).map(r => r.bild_id)
}

export function mitBildern(render, bilder) {
  return render.map(r => {
    if (!('bild_id' in r)) return r
    const { bild_id, ...rest } = r
    return { ...rest, bild: bilder.get(Number(bild_id)) || null }
  })
}
