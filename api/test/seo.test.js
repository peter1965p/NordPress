import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { starteTestumgebung } from './hilfe.js'
import { kuerzen } from '../src/lib/seo.js'

// Vorlage wie die gebaute index.html von Vite
const web = fs.mkdtempSync(path.join(os.tmpdir(), 'nordpress-web-'))
fs.writeFileSync(path.join(web, 'index.html'), `<!doctype html>
<html lang="de"><head><meta charset="utf-8" /><title>NordPress</title><script type="module" src="/assets/index-abc.js"></script></head>
<body><div id="app"></div></body></html>`)

let u, admin
before(async () => {
  u = await starteTestumgebung({ konfig: { webOrdner: web, seitenAdresse: 'https://beispiel.de/' } })
  await u.benutzer('admin@example.org', 'admin')
  admin = await u.anmelden('admin@example.org')
  await admin('PUT', '/admin/api/settings', { title: 'Päffgen IT', tagline: 'Systems & Development' })
})
after(async () => { await u.beenden(); fs.rmSync(web, { recursive: true, force: true }) })

const holen = async url => u.app.inject({ method: 'GET', url })
const ld = html => [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(m => JSON.parse(m[1]))
const absatz = text => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })
const LANG = 'Wir entwickeln Websites, Apps und Schnittstellen für kleine Firmen in Norddeutschland, schnell und ohne Ballast. '.repeat(3)

test('Beitrag: Titel, Beschreibung, Canonical, Open Graph, JSON-LD und Inhalt ohne JavaScript', async () => {
  const k = (await admin('POST', '/admin/api/terms', { taxonomy: 'category', name: 'Technik' })).json()
  const r = await admin('POST', '/admin/api/posts', {
    type: 'post', title: 'Headless <CMS> erklärt', status: 'published', term_ids: [k.id],
    blocks: [{ id: 't', typ: 'text', doc: absatz(LANG) }, { id: 'c', typ: 'code', sprache: 'html', quelle: '<script>alert(1)</script>' }],
  })
  assert.equal(r.statusCode, 201, r.body)
  const antwort = await holen(`/beitrag/${r.json().slug}`)
  assert.equal(antwort.statusCode, 200)
  assert.match(antwort.headers['content-type'], /text\/html/)
  const html = antwort.body

  assert.match(html, /<title>Headless &lt;CMS&gt; erklärt · Päffgen IT<\/title>/)
  assert.match(html, /<meta name="description" content="Wir entwickeln Websites, Apps/)
  assert.match(html, /<link rel="canonical" href="https:\/\/beispiel\.de\/beitrag\/headless-cms-erklaert">/)
  assert.match(html, /<meta property="og:type" content="article">/)
  assert.match(html, /<meta name="robots" content="index, follow/)
  assert.match(html, /<h1>Headless &lt;CMS&gt; erklärt<\/h1>/, 'Hauptüberschrift im HTML')
  assert.match(html, /<p>Wir entwickeln Websites/, 'Text steht im HTML')
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/, 'Code nur als Text')
  assert.doesNotMatch(html, /<script>alert/)
  assert.match(html, /<script type="module" src="\/assets\/index-abc\.js">/, 'Vue-App wird weiter geladen')

  const [artikel, pfad] = ld(html)
  assert.equal(artikel['@type'], 'BlogPosting')
  assert.equal(artikel.headline, 'Headless <CMS> erklärt')
  assert.equal(artikel.articleSection, 'Technik')
  assert.equal(artikel.author.name, 'admin')
  assert.equal(pfad['@type'], 'BreadcrumbList')
})

test('eigener SEO-Titel und -Beschreibung, noindex, Entwürfe gibt es nicht', async () => {
  const r = await admin('POST', '/admin/api/posts', {
    type: 'page', title: 'Leistungen', status: 'published', seo_titel: 'IT-Service in Bremen | Päffgen IT', seo_beschreibung: 'Websites & Apps.', noindex: true,
    blocks: [{ id: 'h', typ: 'hero', titel: 'Wir *bauen* das', untertitel: 'Schnell und sauber', buttons: [{ text: 'Kontakt', link: '/seite/kontakt' }] }],
  })
  assert.equal(r.json().seo_titel, 'IT-Service in Bremen | Päffgen IT', 'Admin bekommt die Felder zurück')
  const html = (await holen('/seite/leistungen')).body
  assert.match(html, /<title>IT-Service in Bremen \| Päffgen IT<\/title>/)
  assert.match(html, /<meta name="description" content="Websites &amp; Apps\.">/)
  assert.match(html, /<meta name="robots" content="noindex, follow">/)
  assert.match(html, /<h1>Wir <em>bauen<\/em> das<\/h1>/, 'beginnt mit Hero: Hero-Titel ist h1')
  assert.match(html, /<a href="\/seite\/kontakt">Kontakt<\/a>/)
  assert.equal((await holen('/api/v1/pages/leistungen')).json().seo.noindex, true)

  await admin('POST', '/admin/api/posts', { type: 'post', title: 'Geheim', status: 'draft', blocks: [] })
  const fehlt = await holen('/beitrag/geheim')
  assert.equal(fehlt.statusCode, 404)
  assert.match(fehlt.body, /noindex/)
  assert.equal((await holen('/beitrag/G%3Cx')).statusCode, 400, 'nur gültige Slugs')
})

test('Startseite aus einer Seite: kanonisch /, mit WebSite-Daten', async () => {
  await admin('POST', '/admin/api/posts', { type: 'page', title: 'Willkommen', status: 'published', blocks: [{ id: 't', typ: 'text', doc: absatz(LANG) }] })
  await admin('PUT', '/admin/api/settings', { startseite: 'willkommen' })
  const html = (await holen('/')).body
  assert.match(html, /<title>Päffgen IT – Systems &amp; Development<\/title>/)
  assert.match(html, /<link rel="canonical" href="https:\/\/beispiel\.de\/">/)
  assert.equal(ld(html)[0]['@type'], 'WebSite')
  assert.match(html, /<a href="\/blog">Blog<\/a>/, 'Navigation für Crawler')
  assert.match((await holen('/seite/willkommen')).body, /<link rel="canonical" href="https:\/\/beispiel\.de\/">/, 'keine doppelte Adresse')
  assert.match((await holen('/blog')).body, /<a href="\/beitrag\/headless-cms-erklaert">/)
  await admin('PUT', '/admin/api/settings', { startseite: '' })
})

test('sitemap.xml, robots.txt, llms.txt und feed.xml', async () => {
  const sitemap = (await holen('/sitemap.xml'))
  assert.match(sitemap.headers['content-type'], /application\/xml/)
  assert.match(sitemap.body, /<loc>https:\/\/beispiel\.de\/beitrag\/headless-cms-erklaert<\/loc><lastmod>/)
  assert.match(sitemap.body, /<loc>https:\/\/beispiel\.de\/kategorie\/technik<\/loc>/)
  assert.doesNotMatch(sitemap.body, /leistungen/, 'noindex nicht in der Sitemap')
  assert.doesNotMatch(sitemap.body, /geheim/, 'Entwürfe nicht in der Sitemap')

  const robots = (await holen('/robots.txt')).body
  assert.match(robots, /Disallow: \/admin/)
  assert.match(robots, /Sitemap: https:\/\/beispiel\.de\/sitemap\.xml/)

  const llms = (await holen('/llms.txt')).body
  assert.match(llms, /^# Päffgen IT\n\n> Systems & Development/)
  assert.match(llms, /- \[Headless <CMS> erklärt\]\(https:\/\/beispiel\.de\/beitrag\/headless-cms-erklaert\): Wir entwickeln/)

  const feed = (await holen('/feed.xml')).body
  assert.match(feed, /<rss version="2.0"/)
  assert.match(feed, /<title>Headless &lt;CMS&gt; erklärt<\/title>/)
})

test('leerer Text-Block vor dem Hero: keine doppelte Überschrift, Logo-Variante erlaubt', async () => {
  const r = await admin('POST', '/admin/api/posts', {
    type: 'page', title: 'Impressum', status: 'published',
    blocks: [
      { id: 'leer', typ: 'text', doc: { type: 'doc', content: [{ type: 'paragraph' }] } },
      { id: 'h', typ: 'hero', variante: 'logo', titel: 'Impressum', untertitel: 'Angaben gemäß § 5 DDG' },
    ],
  })
  assert.equal(r.statusCode, 201, r.body)
  const html = (await holen('/seite/impressum')).body
  assert.equal(html.match(/<h1>/g).length, 1, 'genau eine Hauptüberschrift')
  assert.match(html, /<article><section><h1>Impressum<\/h1>/, 'der Hero liefert sie')
})

test('unbekannte Adressen: echte 404 mit Leuchtturm-Text, API bleibt JSON', async () => {
  const r = await holen('/gibts/nicht')
  assert.equal(r.statusCode, 404)
  assert.match(r.headers['content-type'], /text\/html/)
  assert.match(r.body, /Sorry, das was du gerade suchst, <em>haben wir nicht!<\/em>/)
  assert.match(r.body, /<meta name="robots" content="noindex, follow">/)
  const api = await holen('/api/v1/gibtsnicht')
  assert.equal(api.statusCode, 404)
  assert.deepEqual(api.json(), { fehler: 'Nicht gefunden' })
  assert.equal((await holen('/beitrag/gibtsnicht')).statusCode, 404)
})

test('Beschreibung wird an einer Wortgrenze gekürzt', () => {
  const t = kuerzen(LANG)
  assert.ok(t.length <= 160, t.length)
  assert.match(t, /\w…$/)
})
