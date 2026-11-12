// Vorlage für eine Startseite. Zeigt alle Blocktypen, der Text ist ein Beispiel zum Überschreiben.
import { neueId } from './typen.js'

const absatz = text => ({ type: 'paragraph', content: [{ type: 'text', text }] })

export const startseite = () => [
  {
    typ: 'hero', variante: 'hintergrund', ausrichtung: 'links', abdunkeln: 40, deko: 'norden',
    eyebrow: 'Headless-CMS · Aus dem Norden',
    titel: 'Inhalte pflegen. *Überall* ausliefern.',
    untertitel: 'Seiten aus Blöcken bauen, per REST-API in jedes Frontend liefern.',
    buttons: [
      { text: 'Zum Blog', link: '/blog', stil: 'primaer' },
      { text: 'REST-API ansehen', link: '/api/v1/posts', stil: 'umriss', neues_fenster: true },
    ],
    hinweis: 'Diese Startseite ist eine Vorlage. Im Admin unter Seiten → Start lässt sich jeder Block ändern.',
  },
  {
    typ: 'karten', spalten: 3, hintergrund: 'standard',
    titel: 'Alles, was eine Website braucht',
    untertitel: 'Ohne Plugin-Wildwuchs und ohne Update-Angst.',
    eintraege: [
      { icon: 'laptop', titel: 'Block-Editor', text: 'Hero, Karten, Buttons, Text und Code frei kombinieren, mit Live-Vorschau.' },
      { icon: 'leuchtturm', titel: 'Headless', text: 'Jeder Inhalt kommt als sauberes JSON über die REST-API, für Web, App oder Kiosk.' },
      { icon: 'herz', titel: 'Themes', text: 'Farben, Schrift und Ecken einstellen. Vier Vorlagen zum Start.' },
      { icon: 'anker', titel: 'Sicher', text: 'Geprüfte Eingaben, bereinigtes HTML, strenge CSP und Rollen für Redaktion und Autoren.' },
      { icon: 'wolke', titel: 'Mediathek', text: 'Bilder in S3, ausgeliefert über signierte Links.' },
      { icon: 'welle', titel: 'Schnell', text: 'Fastify, PostgreSQL und ein schlankes Vue-Frontend.' },
    ],
  },
  {
    typ: 'iconliste', spalten: 2, hintergrund: 'sand', titel: 'Unter der Haube',
    eintraege: [
      { icon: 'haken', text: 'Vue 3 und Tailwind 4' },
      { icon: 'blitz', text: 'Fastify mit JSON-Schema-Prüfung' },
      { icon: 'haus', text: 'PostgreSQL mit Volltextsuche' },
      { icon: 'wolke', text: 'S3 und CloudFront' },
    ],
  },
  { typ: 'text', doc: { type: 'doc', content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'In drei Zeilen eingebunden' }] },
    absatz('Jedes Frontend holt sich die Inhalte selbst. So sieht das in JavaScript aus:'),
  ] } },
  {
    typ: 'code', sprache: 'javascript', dateiname: 'beitraege.js',
    quelle: "const antwort = await fetch('/api/v1/posts?per_page=3')\nconst { items } = await antwort.json()\nfor (const b of items) console.log(b.title, b.excerpt)",
  },
  { typ: 'beitraege', titel: 'Neu im Blog', anzahl: 3 },
  {
    typ: 'buttons', ausrichtung: 'mitte', hintergrund: 'akzent',
    eintraege: [{ text: 'Im Admin loslegen', link: '/admin', stil: 'umriss' }],
  },
].map(b => ({ id: neueId(), ...b }))
