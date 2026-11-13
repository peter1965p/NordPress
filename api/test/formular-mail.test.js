import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { starteTestumgebung } from './hilfe.js'

// SES-Attrappe: merkt sich die Befehle, kann auf Wunsch scheitern
const befehle = []
let scheitern = false
const sesClient = { send: async b => { if (scheitern) throw new Error('SES nicht erreichbar'); befehle.push(b) } }

let u, admin
before(async () => {
  u = await starteTestumgebung({ sesClient, konfig: { mailVon: 'noreply@example.org', seitenAdresse: 'https://seite.example/' } })
  await u.benutzer('admin@example.org', 'admin')
  admin = await u.anmelden('admin@example.org')
})
after(() => u.beenden())

const FELDER = [
  { id: 'name', typ: 'text', label: 'Name', pflicht: true },
  { id: 'email', typ: 'email', label: 'E-Mail', pflicht: true },
  { id: 'nachricht', typ: 'textarea', label: 'Nachricht' },
  { id: 'ds', typ: 'checkbox', label: 'Ich stimme der [Datenschutzerklärung](/seite/datenschutz) zu', pflicht: true },
]
const senden = (id, werte) => u.app.inject({ method: 'POST', url: `/api/v1/forms/${id}/einsendungen`, payload: { werte } })
const werte = { name: 'Erika', email: 'erika@example.org', nachricht: 'Zeile 1\nZeile 2', ds: true }

test('Einsendung schickt Mail an die Empfänger des Formulars, Antworten gehen an den Absender', async () => {
  const r = await admin('POST', '/admin/api/forms', { name: 'Kontakt', felder: FELDER, benachrichtigung: 'a@example.org, b@example.org' })
  assert.equal(r.statusCode, 201, r.body)
  assert.equal((await admin('GET', `/admin/api/forms/${r.json().id}`)).json().mail_aktiv, true)

  befehle.length = 0
  assert.equal((await senden(r.json().id, werte)).statusCode, 201)
  assert.equal(befehle.length, 1)
  const m = befehle[0].input
  assert.equal(m.FromEmailAddress, 'noreply@example.org')
  assert.deepEqual(m.Destination.ToAddresses, ['a@example.org', 'b@example.org'])
  assert.deepEqual(m.ReplyToAddresses, ['erika@example.org'])
  assert.equal(m.Content.Simple.Subject.Data, 'Neue Einsendung: Kontakt')
  const text = m.Content.Simple.Body.Text.Data
  assert.match(text, /Name: Erika/)
  assert.match(text, /Nachricht:\nZeile 1\nZeile 2/)
  assert.match(text, /Ich stimme der Datenschutzerklärung zu: Ja/)
  assert.match(text, new RegExp(`https://seite\\.example/admin/formulare/${r.json().id}`))
})

test('ohne Empfänger keine Mail, ungültige Empfänger werden abgelehnt', async () => {
  const r = await admin('POST', '/admin/api/forms', { name: 'Still', felder: FELDER })
  befehle.length = 0
  assert.equal((await senden(r.json().id, werte)).statusCode, 201)
  assert.equal(befehle.length, 0)

  const falsch = await admin('PUT', `/admin/api/forms/${r.json().id}`, { name: 'Still', felder: FELDER, benachrichtigung: 'keine-adresse' })
  assert.equal(falsch.statusCode, 400)
  assert.match(falsch.json().fehler, /Benachrichtigung/)
})

test('scheitert SES, ist die Einsendung trotzdem gespeichert', async () => {
  const r = await admin('POST', '/admin/api/forms', { name: 'Robust', felder: FELDER, benachrichtigung: 'a@example.org' })
  scheitern = true
  try {
    assert.equal((await senden(r.json().id, werte)).statusCode, 201)
  } finally { scheitern = false }
  assert.equal((await admin('GET', `/admin/api/forms/${r.json().id}/einsendungen`)).json().items.length, 1)
})
