import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { starteTestumgebung } from './hilfe.js'

let u
before(async () => {
  u = await starteTestumgebung()
  await u.benutzer('admin@example.org', 'admin')
  await u.benutzer('autor@example.org', 'author')
})
after(() => u.beenden())

const login = (payload, headers = { 'x-nordpress': '1' }) =>
  u.app.inject({ method: 'POST', url: '/admin/api/login', headers, payload })

test('richtiges Passwort setzt ein HttpOnly-Cookie mit SameSite=Strict', async () => {
  const r = await login({ email: 'Admin@Example.org ', password: 'geheim-genug-123' })
  assert.equal(r.statusCode, 200)
  const c = r.cookies.find(k => k.name === 'np_sid')
  assert.ok(c.httpOnly)
  assert.equal(c.sameSite, 'Strict')
  const { rows } = await u.pool.query('SELECT token_hash FROM sessions')
  assert.ok(rows.every(z => z.token_hash !== c.value), 'In der Datenbank steht nur der Hash, nicht der Token')
})

test('falsches Passwort und unbekannte Adresse liefern dieselbe Meldung', async () => {
  const a = await login({ email: 'admin@example.org', password: 'falsch-falsch-falsch' })
  const b = await login({ email: 'gibtsnicht@example.org', password: 'falsch-falsch-falsch' })
  assert.equal(a.statusCode, 401)
  assert.equal(b.statusCode, 401)
  assert.equal(a.json().fehler, b.json().fehler)
})

test('ohne X-Nordpress-Header wird jede Änderung abgelehnt (CSRF)', async () => {
  const r = await login({ email: 'admin@example.org', password: 'geheim-genug-123' }, {})
  assert.equal(r.statusCode, 403)
})

test('ohne Anmeldung kein Zugriff auf die Admin-API', async () => {
  const r = await u.app.inject({ method: 'GET', url: '/admin/api/posts' })
  assert.equal(r.statusCode, 401)
})

test('Autor darf keine Benutzer verwalten und keine Einstellungen ändern', async () => {
  const autor = await u.anmelden('autor@example.org')
  assert.equal((await autor('GET', '/admin/api/users')).statusCode, 403)
  assert.equal((await autor('PUT', '/admin/api/settings', { title: 'gekapert' })).statusCode, 403)
})

test('Abmelden löscht die Sitzung auf dem Server', async () => {
  const admin = await u.anmelden('admin@example.org')
  assert.equal((await admin('GET', '/admin/api/me')).statusCode, 200)
  await admin('POST', '/admin/api/logout')
  assert.equal((await admin('GET', '/admin/api/me')).statusCode, 401)
})

test('zu kurzes Passwort wird beim Anlegen abgelehnt, der letzte Admin bleibt Admin', async () => {
  const admin = await u.anmelden('admin@example.org')
  const kurz = await admin('POST', '/admin/api/users', { email: 'neu@example.org', name: 'Neu', role: 'editor', password: 'kurz' })
  assert.equal(kurz.statusCode, 400)
  const me = (await admin('GET', '/admin/api/me')).json()
  const runter = await admin('PUT', `/admin/api/users/${me.id}`, { role: 'editor' })
  assert.equal(runter.statusCode, 409)
})

test('Login wird nach 10 Versuchen gedrosselt', async () => {
  let letzte
  for (let i = 0; i < 12; i++) letzte = await login({ email: 'x@example.org', password: 'falsch-falsch-falsch' })
  assert.equal(letzte.statusCode, 429)
})
