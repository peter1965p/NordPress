import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { starteTestumgebung } from './hilfe.js'
import { migriere } from '../src/app.js'

let u, admin
before(async () => {
  u = await starteTestumgebung()
  await u.benutzer('admin@example.org', 'admin')
  admin = await u.anmelden('admin@example.org')
})
after(() => u.beenden())

const oeffentlich = async url => (await u.app.inject({ method: 'GET', url })).json()
const doc = (...content) => ({ type: 'doc', content })
const absatz = (text, marks) => ({ type: 'paragraph', content: [{ type: 'text', text, ...(marks ? { marks } : {}) }] })

async function bild(alt) {
  const { rows } = await u.pool.query(
    "INSERT INTO media (filename, original_name, mime, size, alt) VALUES ($1, 'x.jpg', 'image/jpeg', 1, $2) RETURNING id",
    [`${Math.random().toString(16).slice(2, 14).padEnd(24, '0')}.jpg`, alt])
  return Number(rows[0].id)
}

test('Seite aus Blöcken wie eine Stellenanzeige: Hero, Buttons, Icon-Liste', async () => {
  const bildId = await bild('Mitarbeiter im Büro')
  const r = await admin('POST', '/admin/api/posts', {
    type: 'page', title: 'IT-Support', status: 'published',
    blocks: [
      { id: 'h', typ: 'hero', titel: 'Mitarbeiter IT-Support (m/w/d)', untertitel: 'Beispiel GmbH • Bremen', bild_id: bildId, abdunkeln: 40 },
      { id: 'b', typ: 'buttons', eintraege: [{ text: 'Ich will den Job!', link: '#bewerben' }, { text: 'WhatsApp', link: 'https://wa.me/49', stil: 'whatsapp' }] },
      { id: 'l', typ: 'iconliste', titel: 'Unsere Benefits', spalten: 2, hintergrund: 'sand',
        eintraege: [{ icon: 'schild', text: 'Unfallversicherung' }, { icon: 'fahrrad', text: 'Dienstrad' }] },
    ],
  })
  assert.equal(r.statusCode, 201, r.body)
  assert.equal(r.json().blocks.length, 3, 'Admin bekommt die Quelle zurück')

  const s = await oeffentlich('/api/v1/pages/it-support')
  const [hero, knoepfe, liste] = s.blocks
  assert.equal(hero.typ, 'hero')
  assert.equal(hero.variante, 'hintergrund')
  assert.match(hero.bild.url, /^\/uploads\/[a-f0-9]{24}\.jpg$/)
  assert.equal(hero.bild.alt, 'Mitarbeiter im Büro')
  assert.equal(hero.bild_id, undefined, 'öffentlich nur Adresse, keine interne ID')
  assert.equal(knoepfe.eintraege[0].stil, 'primaer', 'Standardstil wird ergänzt')
  assert.deepEqual(liste.eintraege.map(e => e.icon), ['schild', 'fahrrad'])
})

test('Titel mit Akzent: *kursiv* wird zu <em>, sonst kein HTML', async () => {
  const r = await admin('POST', '/admin/api/posts', {
    type: 'page', title: 'Start', status: 'published',
    blocks: [{ id: 'h', typ: 'hero', variante: 'geteilt', titel: 'Your idea deserves *a stage.* <img src=x onerror=alert(1)>' }],
  })
  const hero = (await oeffentlich(`/api/v1/pages/${r.json().slug}`)).blocks[0]
  assert.match(hero.titel_html, /<em>a stage\.<\/em>/)
  assert.doesNotMatch(hero.titel_html, /<img|onerror/)
})

test('gelöschtes Bild hinterlässt keinen toten Link', async () => {
  const bildId = await bild('weg')
  const r = await admin('POST', '/admin/api/posts', {
    type: 'page', title: 'Bild weg', status: 'published', blocks: [{ id: 'h', typ: 'hero', titel: 'x', bild_id: bildId }],
  })
  await u.pool.query('DELETE FROM media WHERE id = $1', [bildId])
  assert.equal((await oeffentlich(`/api/v1/pages/${r.json().slug}`)).blocks[0].bild, null)
})

test('Text aus TipTap: nur bekannte Knoten, gefährliche Links fallen weg', async () => {
  const r = await admin('POST', '/admin/api/posts', {
    type: 'post', title: 'TipTap', status: 'published',
    blocks: [{
      id: 't', typ: 'text', doc: doc(
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Moin' }] },
        absatz('<script>alert(1)</script>'),
        absatz('böser Link', [{ type: 'link', attrs: { href: 'javascript:alert(2)' } }]),
        absatz('guter Link', [{ type: 'link', attrs: { href: 'https://example.org' } }, { type: 'bold' }]),
        { type: 'iframe', attrs: { src: 'https://evil.example' } },
      ),
    }],
  })
  assert.equal(r.statusCode, 201, r.body)
  const b = await oeffentlich(`/api/v1/posts/${r.json().slug}`)
  const html = b.blocks[0].html
  assert.match(html, /<h2>Moin<\/h2>/)
  assert.match(html, /&lt;script&gt;/, 'Text wird maskiert, nicht ausgeführt')
  assert.doesNotMatch(html, /<script|javascript:|iframe|evil/)
  assert.match(html, /<strong><a href="https:\/\/example\.org"[^>]*>guter Link<\/a><\/strong>/)
  assert.equal(b.content_html, html, 'content_html enthält die Textblöcke für einfache Abnehmer')
})

test('ungültige Blöcke werden abgelehnt', async () => {
  const neu = blocks => admin('POST', '/admin/api/posts', { type: 'page', title: 'x', blocks })
  const faelle = {
    'unbekannter Typ': [{ id: 'a', typ: 'zauber' }],
    'unbekanntes Feld': [{ id: 'a', typ: 'hero', titel: 'x', farbe: 'pink' }],
    'javascript-Link': [{ id: 'a', typ: 'buttons', eintraege: [{ text: 'x', link: 'javascript:alert(1)' }] }],
    'fremde Domain ohne Schema': [{ id: 'a', typ: 'buttons', eintraege: [{ text: 'x', link: '//evil.example' }] }],
    'Pflichtfeld fehlt': [{ id: 'a', typ: 'hero' }],
    'ohne id': [{ typ: 'markdown', quelle: 'x' }],
    'unbekannter Hintergrund': [{ id: 'a', typ: 'iconliste', hintergrund: 'pink', eintraege: [{ text: 'x' }] }],
  }
  for (const [fall, blocks] of Object.entries(faelle)) {
    assert.equal((await neu(blocks)).statusCode, 400, fall)
  }
  const beides = await admin('POST', '/admin/api/posts', { type: 'post', title: 'x', content: 'a', blocks: [] })
  assert.equal(beides.statusCode, 400)
})

test('bisherige Oberfläche: Markdown wird zum Block, Blockseiten überschreibt sie nicht', async () => {
  const md = (await admin('POST', '/admin/api/posts', { type: 'post', title: 'Alt', content: '# Hallo' })).json()
  assert.deepEqual(md.blocks, [{ id: 'b1', typ: 'markdown', quelle: '# Hallo' }])
  assert.equal(md.content, '# Hallo')
  const geaendert = (await admin('PUT', `/admin/api/posts/${md.id}`, { content: '# Neu' })).json()
  assert.equal(geaendert.blocks[0].quelle, '# Neu')

  const seite = (await admin('POST', '/admin/api/posts', { type: 'page', title: 'Blockseite', blocks: [{ id: 'h', typ: 'hero', titel: 'x' }] })).json()
  assert.equal(seite.content, '')
  const r = await admin('PUT', `/admin/api/posts/${seite.id}`, { content: 'überschreiben' })
  assert.equal(r.statusCode, 409)
  const titel = await admin('PUT', `/admin/api/posts/${seite.id}`, { title: 'Nur Titel' })
  assert.equal(titel.json().blocks[0].typ, 'hero', 'Ändern ohne content/blocks lässt die Blöcke stehen')
})

test('Code-Block: Quelle bleibt Text, wird nie zu HTML', async () => {
  const quelle = '<script>alert(1)</script>\nconst x = 1 && 2'
  const r = await admin('POST', '/admin/api/posts', {
    type: 'post', title: 'Mit Code', status: 'published',
    blocks: [{ id: 'c', typ: 'code', sprache: 'javascript', dateiname: 'demo.js', quelle }],
  })
  assert.equal(r.statusCode, 201, r.body)
  const b = await oeffentlich(`/api/v1/posts/${r.json().slug}`)
  assert.deepEqual(b.blocks[0], { id: 'c', typ: 'code', sprache: 'javascript', dateiname: 'demo.js', quelle })
  assert.equal(b.blocks[0].html, undefined, 'kein HTML-Feld, die Website gibt Text aus')
  assert.equal(b.content_html, '', 'Code landet nicht im content_html')
  assert.equal((await admin('POST', '/admin/api/posts', {
    type: 'post', title: 'x', blocks: [{ id: 'c', typ: 'code', sprache: 'brainfuck', quelle: '+' }],
  })).statusCode, 400, 'unbekannte Sprache')
  assert.deepEqual((await oeffentlich('/api/v1/posts?search=demo.js')).items.map(p => p.title), ['Mit Code'])
})

test('Suche findet Text in Blöcken', async () => {
  await admin('POST', '/admin/api/posts', {
    type: 'post', title: 'Unauffällig', status: 'published',
    blocks: [{ id: 'l', typ: 'iconliste', eintraege: [{ text: 'Steuerfreier Gutschein' }] }],
  })
  const r = await oeffentlich('/api/v1/posts?search=Gutschein')
  assert.deepEqual(r.items.map(p => p.title), ['Unauffällig'])
})

test('Migration 002 macht aus vorhandenem Markdown einen Block', async () => {
  // Zustand vor 002 nachstellen: Spalten weg, Beitrag mit Markdown anlegen, Migration erneut laufen lassen
  await u.pool.query('ALTER TABLE posts DROP COLUMN blocks, DROP COLUMN blocks_render, DROP COLUMN such_text')
  await u.pool.query("DELETE FROM schema_migrations WHERE name = '002_bloecke.sql'")
  await u.pool.query(`INSERT INTO posts (type, title, slug, content, content_html, status, published_at)
    VALUES ('post', 'Von früher', 'von-frueher', '**alt**', '<p><strong>alt</strong></p>', 'published', now())`)
  assert.deepEqual(await migriere(u.pool), ['002_bloecke.sql'])

  const b = await oeffentlich('/api/v1/posts/von-frueher')
  assert.deepEqual(b.blocks, [{ id: 'b1', typ: 'markdown', html: '<p><strong>alt</strong></p>' }])
  assert.equal((await oeffentlich('/api/v1/posts?search=alt')).items.some(p => p.slug === 'von-frueher'), true)
})


test('Startseite: Karten und neueste Beiträge, als Startseite einstellbar', async () => {
  const r = await admin('POST', '/admin/api/posts', {
    type: 'page', title: 'Home', status: 'published',
    blocks: [
      { id: 'k', typ: 'karten', titel: 'Leistungen', spalten: 3,
        eintraege: [{ icon: 'rakete', titel: 'Schnell', text: 'Läuft.', link: '/seite/kontakt' }, { titel: 'Ohne Icon' }] },
      { id: 'p', typ: 'beitraege', titel: 'Neu im Blog', anzahl: 6 },
    ],
  })
  assert.equal(r.statusCode, 201, r.body)
  const [karten, beitraege] = (await oeffentlich('/api/v1/pages/home')).blocks
  assert.deepEqual(karten.eintraege, [{ icon: 'rakete', titel: 'Schnell', text: 'Läuft.', link: '/seite/kontakt' }, { icon: 'punkt', titel: 'Ohne Icon' }])
  assert.equal(karten.hintergrund, 'standard')
  assert.deepEqual(beitraege, { id: 'p', typ: 'beitraege', titel: 'Neu im Blog', anzahl: 6 })

  for (const b of [
    { id: 'x', typ: 'karten', eintraege: [{ titel: 'a', link: 'javascript:alert(1)' }] },
    { id: 'x', typ: 'karten', spalten: 1, eintraege: [{ titel: 'a' }] },
    { id: 'x', typ: 'beitraege', anzahl: 500 },
  ]) assert.equal((await admin('POST', '/admin/api/posts', { type: 'page', title: 'x', blocks: [b] })).statusCode, 400, JSON.stringify(b))

  assert.equal((await oeffentlich('/api/v1/settings')).startseite, '')
  assert.equal((await admin('PUT', '/admin/api/settings', { startseite: 'home' })).statusCode, 200)
  assert.equal((await oeffentlich('/api/v1/settings')).startseite, 'home')
  assert.equal((await admin('PUT', '/admin/api/settings', { startseite: '../x' })).statusCode, 400)
})
