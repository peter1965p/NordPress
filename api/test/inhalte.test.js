import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { starteTestumgebung } from './hilfe.js'

let u, admin, autor, autor2
before(async () => {
  u = await starteTestumgebung()
  await u.benutzer('admin@example.org', 'admin')
  await u.benutzer('autor@example.org', 'author')
  await u.benutzer('autor2@example.org', 'author')
  admin = await u.anmelden('admin@example.org')
  autor = await u.anmelden('autor@example.org')
  autor2 = await u.anmelden('autor2@example.org')
})
after(() => u.beenden())

const oeffentlich = url => u.app.inject({ method: 'GET', url })

test('Entwurf ist öffentlich unsichtbar, nach Veröffentlichen sichtbar', async () => {
  const r = await admin('POST', '/admin/api/posts', { type: 'post', title: 'Grüße aus Bremen', content: '# Moin\n\nText' })
  assert.equal(r.statusCode, 201)
  const b = r.json()
  assert.equal(b.slug, 'gruesse-aus-bremen')
  assert.equal(b.status, 'draft')
  assert.equal((await oeffentlich('/api/v1/posts/gruesse-aus-bremen')).statusCode, 404)

  await admin('PUT', `/admin/api/posts/${b.id}`, { status: 'published' })
  const o = await oeffentlich('/api/v1/posts/gruesse-aus-bremen')
  assert.equal(o.statusCode, 200)
  assert.match(o.json().content_html, /<h1>Moin<\/h1>/)
  assert.equal(o.json().content, undefined, 'Markdown-Quelle bleibt intern')
  assert.equal(o.headers['access-control-allow-origin'], '*')
})

test('gleicher Titel bekommt einen eigenen Slug', async () => {
  const a = (await admin('POST', '/admin/api/posts', { type: 'post', title: 'Doppelt' })).json()
  const b = (await admin('POST', '/admin/api/posts', { type: 'post', title: 'Doppelt' })).json()
  assert.equal(a.slug, 'doppelt')
  assert.equal(b.slug, 'doppelt-2')
})

test('HTML im Markdown wird entschärft', async () => {
  const b = (await admin('POST', '/admin/api/posts', {
    type: 'post', title: 'XSS-Versuch', status: 'published',
    content: 'Hallo <script>alert(1)</script> <img src="x" onerror="alert(2)"> [klick](javascript:alert(3))',
  })).json()
  const html = (await oeffentlich(`/api/v1/posts/${b.slug}`)).json().content_html
  assert.doesNotMatch(html, /<script|onerror|javascript:/i)
})

test('Autor sieht nur eigene Beiträge und darf fremde nicht ändern, keine Seiten anlegen', async () => {
  const eigen = (await autor('POST', '/admin/api/posts', { type: 'post', title: 'Vom Autor' })).json()
  const fremd = (await autor2('POST', '/admin/api/posts', { type: 'post', title: 'Vom zweiten Autor' })).json()
  const liste = (await autor('GET', '/admin/api/posts')).json()
  assert.ok(liste.items.every(p => p.author_id === eigen.author_id))
  assert.equal((await autor('PUT', `/admin/api/posts/${fremd.id}`, { title: 'gekapert' })).statusCode, 403)
  assert.equal((await autor('DELETE', `/admin/api/posts/${fremd.id}`)).statusCode, 403)
  assert.equal((await autor('POST', '/admin/api/posts', { type: 'page', title: 'Impressum' })).statusCode, 403)
})

test('Kategorien und Schlagwörter filtern die öffentliche Liste', async () => {
  const kat = (await admin('POST', '/admin/api/terms', { taxonomy: 'category', name: 'Cloud & Betrieb' })).json()
  const tag = (await admin('POST', '/admin/api/terms', { taxonomy: 'tag', name: 'AWS' })).json()
  assert.equal(kat.slug, 'cloud-betrieb')
  await admin('POST', '/admin/api/posts', { type: 'post', title: 'EC2 mit nginx', status: 'published', term_ids: [kat.id, tag.id] })
  await admin('POST', '/admin/api/posts', { type: 'post', title: 'Ohne Kategorie', status: 'published' })

  const gefiltert = (await oeffentlich('/api/v1/posts?category=cloud-betrieb')).json()
  assert.deepEqual(gefiltert.items.map(p => p.title), ['EC2 mit nginx'])
  assert.deepEqual(gefiltert.items[0].tags, [{ name: 'AWS', slug: 'aws' }])
  const kats = (await oeffentlich('/api/v1/categories')).json().items
  assert.deepEqual(kats, [{ name: 'Cloud & Betrieb', slug: 'cloud-betrieb', count: 1 }])
  assert.equal((await autor('POST', '/admin/api/terms', { taxonomy: 'category', name: 'Darf nicht' })).statusCode, 403)
  assert.equal((await autor('POST', '/admin/api/terms', { taxonomy: 'tag', name: 'Darf' })).statusCode, 201)
})

test('Suche und Seitenzählung', async () => {
  for (let i = 1; i <= 3; i++) await admin('POST', '/admin/api/posts', { type: 'post', title: `Serie ${i}`, status: 'published' })
  const r = (await oeffentlich('/api/v1/posts?search=Serie&per_page=2&page=2')).json()
  assert.equal(r.total, 3)
  assert.equal(r.items.length, 1)
  const leer = (await oeffentlich('/api/v1/posts?search=100%25')).json()
  assert.equal(leer.total, 0, '% wird als Zeichen gesucht, nicht als Platzhalter')
})

test('Seiten erscheinen im Menü nach Reihenfolge, Einstellungen sind öffentlich lesbar', async () => {
  await admin('POST', '/admin/api/posts', { type: 'page', title: 'Impressum', status: 'published', menu_order: 9 })
  await admin('POST', '/admin/api/posts', { type: 'page', title: 'Über mich', status: 'published', menu_order: 1 })
  await admin('POST', '/admin/api/posts', { type: 'page', title: 'Geheim', status: 'draft' })
  const seiten = (await oeffentlich('/api/v1/pages')).json().items.map(s => s.slug)
  assert.deepEqual(seiten, ['ueber-mich', 'impressum'])
  await admin('PUT', '/admin/api/settings', { title: 'Mein Blog' })
  assert.equal((await oeffentlich('/api/v1/settings')).json().title, 'Mein Blog')
})

test('Zurück auf Entwurf nimmt den Beitrag offline', async () => {
  const b = (await admin('POST', '/admin/api/posts', { type: 'post', title: 'Kurz online', status: 'published' })).json()
  assert.ok(b.published_at)
  const z = (await admin('PUT', `/admin/api/posts/${b.id}`, { status: 'draft' })).json()
  assert.equal(z.published_at, null)
  assert.equal((await oeffentlich(`/api/v1/posts/${b.slug}`)).statusCode, 404)
})

test('unbekannte Felder werden abgelehnt', async () => {
  const r = await admin('POST', '/admin/api/posts', { type: 'post', title: 'x', author_id: 1 })
  assert.equal(r.statusCode, 400)
  assert.equal(r.json().fehler, 'Ungültige Eingabe', 'eigener Fehlerhandler greift auch in der Admin-API')
})

test('Theme: Standard ohne Eintrag, nur Admins ändern, Werte werden geprüft', async () => {
  const vorher = (await oeffentlich('/api/v1/settings')).json().theme
  assert.equal(vorher.modus, 'hell')
  assert.match(vorher.akzent, /^#[0-9a-f]{6}$/i)

  const theme = { vorlage: 'studio', akzent: '#ff3366', flaeche: '#1f2937', modus: 'dunkel', schrift: 'editorial', radius: 'rund' }
  assert.equal((await admin('PUT', '/admin/api/settings', { theme })).statusCode, 200)
  assert.deepEqual((await oeffentlich('/api/v1/settings')).json().theme, theme)

  const kaputt = [
    { ...theme, akzent: 'red; background:url(x)' },
    { ...theme, schrift: 'comic-sans' },
    { ...theme, css: 'body{}' },
    { akzent: '#ffffff' },
  ]
  for (const t of kaputt) assert.equal((await admin('PUT', '/admin/api/settings', { theme: t })).statusCode, 400, JSON.stringify(t))
  assert.equal((await autor('PUT', '/admin/api/settings', { theme })).statusCode, 403)
})
