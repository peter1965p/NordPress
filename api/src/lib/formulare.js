import { empfaengerGueltig } from './mail.js'

// Formulare: Schema der Felder (Admin) und Prüfung der Einsendungen (Website).

export const FELDTYPEN = ['text', 'email', 'telefon', 'textarea', 'auswahl', 'checkbox', 'schalter']
// Felder mit Ja/Nein statt Text
export const JA_NEIN = ['checkbox', 'schalter']
const MAX_LAENGE = { text: 300, email: 200, telefon: 50, textarea: 5000, auswahl: 100 }
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TELEFON = /^[+()0-9\s/-]{3,50}$/

const feld = {
  type: 'object',
  required: ['id', 'typ', 'label'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', pattern: '^[a-z0-9_]{1,40}$' },
    typ: { type: 'string', enum: FELDTYPEN },
    label: { type: 'string', minLength: 1, maxLength: 300 },
    pflicht: { type: 'boolean' },
    platzhalter: { type: 'string', maxLength: 200 },
    optionen: { type: 'array', maxItems: 30, items: { type: 'string', minLength: 1, maxLength: 100 } },
    breite: { type: 'string', enum: ['voll', 'halb'] },
  },
}

export const formularSchema = {
  type: 'object',
  required: ['name', 'felder'],
  additionalProperties: false,
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 120 },
    felder: { type: 'array', maxItems: 30, items: feld },
    absenden_text: { type: 'string', minLength: 1, maxLength: 60 },
    erfolg_text: { type: 'string', minLength: 1, maxLength: 500 },
    benachrichtigung: { type: 'string', maxLength: 500 },
  },
}

// Was das Schema nicht ausdrücken kann. Liefert eine Fehlermeldung oder null.
export function pruefeFormular(f) {
  if (f.benachrichtigung && !empfaengerGueltig(f.benachrichtigung)) return 'Benachrichtigung: höchstens 5 gültige E-Mail-Adressen, durch Komma getrennt'
  const ids = new Set()
  for (const x of f.felder) {
    if (ids.has(x.id)) return `Feld-ID „${x.id}“ ist doppelt`
    ids.add(x.id)
    if (x.typ === 'auswahl' && !x.optionen?.length) return `Auswahlfeld „${x.label}“ braucht mindestens eine Option`
  }
  return null
}

// Öffentliche Form: nur was die Website zum Anzeigen braucht.
export const formularOeffentlich = r => ({
  id: Number(r.id),
  absenden_text: r.absenden_text,
  erfolg_text: r.erfolg_text,
  felder: r.felder.map(x => ({
    id: x.id, typ: x.typ, label: x.label, pflicht: !!x.pflicht, breite: x.breite || 'voll',
    ...(x.platzhalter ? { platzhalter: x.platzhalter } : {}),
    ...(x.typ === 'auswahl' ? { optionen: x.optionen } : {}),
  })),
})

// Prüft die Werte einer Einsendung gegen die Felder. Liefert { fehler } oder { daten } zum Speichern.
export function pruefeEinsendung(felder, werte) {
  const daten = []
  for (const x of felder) {
    const roh = werte[x.id]
    if (JA_NEIN.includes(x.typ)) {
      if (roh !== undefined && typeof roh !== 'boolean') return { fehler: `${x.label}: ungültiger Wert` }
      if (x.pflicht && roh !== true) return { fehler: `${x.label}: bitte bestätigen` }
      daten.push({ id: x.id, label: x.label, typ: x.typ, wert: roh === true })
      continue
    }
    if (roh !== undefined && typeof roh !== 'string') return { fehler: `${x.label}: ungültiger Wert` }
    const wert = (roh || '').trim()
    if (!wert) {
      if (x.pflicht) return { fehler: `${x.label}: Pflichtfeld` }
      daten.push({ id: x.id, label: x.label, typ: x.typ, wert: '' })
      continue
    }
    if (wert.length > MAX_LAENGE[x.typ]) return { fehler: `${x.label}: zu lang (höchstens ${MAX_LAENGE[x.typ]} Zeichen)` }
    if (x.typ === 'email' && !EMAIL.test(wert)) return { fehler: `${x.label}: keine gültige E-Mail-Adresse` }
    if (x.typ === 'telefon' && !TELEFON.test(wert)) return { fehler: `${x.label}: keine gültige Telefonnummer` }
    if (x.typ === 'auswahl' && !x.optionen.includes(wert)) return { fehler: `${x.label}: ungültige Auswahl` }
    daten.push({ id: x.id, label: x.label, typ: x.typ, wert })
  }
  return { daten }
}
