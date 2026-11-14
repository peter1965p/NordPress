import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { starteTestumgebung } from './hilfe.js'

// Resend-Attrappe statt fetch: merkt sich die Aufrufe, kann eine Fehlermeldung von Resend liefern
const aufrufe = []
let antwortVonResend = { status: 200, body: { id: 'abc' } }
const abrufen = async (url, opt) => {
  aufrufe.push({ url, ...opt, body: JSON.parse(opt.body) })
  return new Response(JSON.stringify(antwortVonResend.body), { status: antwortVonResend.status })
}
const sesBefehle = []
const sesClient = { send: async b => { sesBefehle.push(b) } }

const KEY = 're_Abcdefgh_1234567890xyz9'
let u, admin, autor
before(async () => {
  u = await starteTestumgebung({ abrufen, sesClient, konfig: { mailVon: 'noreply@example.org' } })
  await u.benutzer('admin@example.org', 'admin')
  await u.benutzer('autor@example.org', 'author')
  admin = await u.anmelden('admin@example.org')
  autor = await u.anmelden('autor@example.org')
})
after(() => u.beenden())

const senden = (id, werte) => u.app.inject({ method: 'POST', url: `/api/v1/forms/${id}/einsendungen`, payload: { werte } })

test('ohne Key: SES wie bisher, Einstellungen zeigen keinen Key', async () => {
  const e = (await admin('GET', '/admin/api/settings')).json()
  assert.deepEqual(e.mail, { art: 'ses', von: '', von_standard: 'noreply@example.org', resend: { gesetzt: false } })
})

test('Key im Admin eintragen: liegt im Geheim-Speicher, nie in DB oder Antwort, Mails gehen über Resend', async () => {
  assert.equal((await admin('PUT', '/admin/api/settings', { resend_key: 'sk_falsch' })).statusCode, 400)
  assert.equal((await admin('PUT', '/admin/api/settings', { mail_von: 'kaputt <x>' })).statusCode, 400)
  assert.equal((await autor('PUT', '/admin/api/settings', { resend_key: KEY })).statusCode, 403)

  const r = await admin('PUT', '/admin/api/settings', { resend_key: KEY, mail_von: 'Päffgen IT <noreply@example.org>' })
  assert.equal(r.statusCode, 200, r.body)
  assert.doesNotMatch(r.body, /Abcdefgh/, 'Key kommt nicht zurück')
  assert.deepEqual(r.json().mail.resend, { gesetzt: true, ende: 'xyz9' })
  assert.equal(r.json().mail.art, 'resend')
  const { rows } = await u.pool.query('SELECT value FROM settings')
  assert.ok(rows.every(x => !x.value.includes('Abcdefgh')), 'Key nicht in der Datenbank')
  assert.doesNotMatch((await autor('GET', '/admin/api/settings')).body, /Abcdefgh/)
  assert.doesNotMatch((await u.app.inject({ method: 'GET', url: '/api/v1/settings' })).body, /Abcdefgh|resend/)

  const f = (await admin('POST', '/admin/api/forms', { name: 'Kontakt', benachrichtigung: 'chef@example.org',
    felder: [{ id: 'email', typ: 'email', label: 'E-Mail', pflicht: true }, { id: 'n', typ: 'textarea', label: 'Nachricht' }] })).json()
  assert.equal(f.mail_aktiv, true)
  aufrufe.length = 0; sesBefehle.length = 0
  assert.equal((await senden(f.id, { email: 'erika@example.org', n: 'Moin' })).statusCode, 201)
  assert.equal(sesBefehle.length, 0, 'nicht mehr über SES')
  assert.equal(aufrufe.length, 1)
  const a = aufrufe[0]
  assert.equal(a.url, 'https://api.resend.com/emails')
  assert.equal(a.headers.Authorization, `Bearer ${KEY}`)
  assert.equal(a.body.from, 'Päffgen IT <noreply@example.org>')
  assert.deepEqual(a.body.to, ['chef@example.org'])
  assert.equal(a.body.reply_to, 'erika@example.org')
  assert.match(a.body.text, /Nachricht:\nMoin/)
})

test('Test-Mail an die eigene Adresse, Fehler von Resend kommen lesbar zurück', async () => {
  aufrufe.length = 0
  const ok = await admin('POST', '/admin/api/settings/testmail')
  assert.equal(ok.statusCode, 200, ok.body)
  assert.deepEqual(ok.json(), { ok: true, an: 'admin@example.org', art: 'resend' })
  assert.deepEqual(aufrufe[0].body.to, ['admin@example.org'])

  antwortVonResend = { status: 403, body: { message: 'The example.org domain is not verified.' } }
  const fehl = await admin('POST', '/admin/api/settings/testmail')
  assert.equal(fehl.statusCode, 502)
  assert.match(fehl.json().fehler, /Resend 403: The example\.org domain is not verified/)
  assert.doesNotMatch(fehl.body, /Abcdefgh/)
  antwortVonResend = { status: 200, body: { id: 'abc' } }
  assert.equal((await autor('POST', '/admin/api/settings/testmail')).statusCode, 403)
})

test('Key entfernen: zurück zu SES', async () => {
  const r = await admin('PUT', '/admin/api/settings', { resend_key: '' })
  assert.deepEqual(r.json().mail.resend, { gesetzt: false })
  assert.equal(r.json().mail.art, 'ses')
  assert.equal((await admin('PUT', '/admin/api/settings', { title: 'X' })).json().mail.resend.gesetzt, false, 'ohne resend_key bleibt alles')
})
