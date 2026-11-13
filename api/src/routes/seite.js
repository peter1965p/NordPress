// Öffentliche Seiten als fertiges HTML (SEO/GEO), dazu sitemap.xml, robots.txt, llms.txt und feed.xml.
// nginx leitet nur diese Pfade hierher, alles andere bleibt statisch. Die Vue-App übernimmt nach dem Laden.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { BEITRAG_JOINS, BEITRAG_SPALTEN, bilderZu, medienAdresse, termeZu } from '../lib/inhalte.js'
import { mitBildern } from '../lib/bloecke.js'
import {
  bloeckeHtml, esc, einzeilig, kuerzen, ldInhalt, ldPfad, ldWebsite, rssXml, seiteHtml, sitemapXml, textAnfang,
} from '../lib/seo.js'

const API = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const ERSATZ = '<!doctype html><html lang="de"><head><meta charset="utf-8"><title></title></head><body><div id="app"></div></body></html>'

// index.html der gebauten Vue-App. Server: /opt/nordpress/web, Entwicklung: web/dist
function findeVorlage(k) {
  const kandidaten = [k.webOrdner, path.join(API, '..', 'web'), path.join(API, '..', 'web', 'dist')].filter(Boolean)
  for (const ordner of kandidaten) {
    const datei = path.join(ordner, 'index.html')
    // web/index.html im Repository ist die Vite-Quelle, nicht die gebaute Datei
    if (fs.existsSync(datei) && !fs.readFileSync(datei, 'utf8').includes('/src/main.js')) return datei
  }
  return null
}

export default async function seitenRouten(app) {
  const db = app.db
  let vorlage = null
  const ladeVorlage = () => {
    if (vorlage) return vorlage
    const datei = findeVorlage(app.konfig)
    if (!datei) return ERSATZ   // noch nicht gebaut: nicht zwischenspeichern
    vorlage = fs.readFileSync(datei, 'utf8')
    return vorlage
  }

  const basisVon = anfrage => (app.konfig.seitenAdresse || `${anfrage.protocol}://${anfrage.host}`).replace(/\/+$/, '')

  async function einstellungen() {
    const { rows } = await db.query("SELECT key, value FROM settings WHERE key IN ('title', 'tagline', 'startseite')")
    const e = Object.fromEntries(rows.map(r => [r.key, r.value]))
    const { rows: seiten } = await db.query(
      "SELECT title, slug FROM posts WHERE type = 'page' AND status = 'published' AND NOT noindex ORDER BY menu_order, title")
    return { title: e.title || 'NordPress', tagline: e.tagline || '', startseite: e.startseite || '', seiten }
  }

  const neuesteBeitraege = async (anzahl = 20, kategorie = null) => (await db.query(
    `SELECT p.title, p.slug, p.excerpt, p.blocks_render, p.content_html, p.seo_beschreibung, p.published_at, p.updated_at, u.name AS author_name
     FROM posts p LEFT JOIN users u ON u.id = p.author_id
     WHERE p.type = 'post' AND p.status = 'published' AND NOT p.noindex
       ${kategorie ? `AND EXISTS (SELECT 1 FROM post_terms pt JOIN terms t ON t.id = pt.term_id
         WHERE pt.post_id = p.id AND t.taxonomy = 'category' AND t.slug = $2)` : ''}
     ORDER BY p.published_at DESC LIMIT $1`, kategorie ? [anzahl, kategorie] : [anzahl])).rows

  const beschreibungVon = r => kuerzen(r.seo_beschreibung || r.excerpt || textAnfang(r.blocks_render || []))

  function senden(antwort, html, code = 200) {
    return antwort.code(code).type('text/html; charset=utf-8')
      .header('Cache-Control', code === 200 ? 'public, max-age=60' : 'no-store').send(html)
  }

  async function nichtGefunden(anfrage, antwort, einst) {
    const html = seiteHtml(ladeVorlage(), basisVon(anfrage), einst,
      { titel: `Nicht gefunden · ${einst.title}`, pfad: anfrage.url.split('?')[0], noindex: true },
      `<h1>Nicht gefunden</h1><p>Diese Seite gibt es nicht (mehr). <a href="/">Zur Startseite</a></p>`)
    return senden(antwort, html, 404)
  }

  // Ein Beitrag oder eine Seite. pfad: unter welcher Adresse sie kanonisch steht.
  async function inhaltSeite(anfrage, antwort, typ, slug, { pfad, startseite = false } = {}) {
    const einst = await einstellungen()
    const { rows: [r] } = await db.query(
      `SELECT ${BEITRAG_SPALTEN} ${BEITRAG_JOINS} WHERE p.type = $1 AND p.slug = $2 AND p.status = 'published'`, [typ, slug])
    if (!r) return startseite ? null : nichtGefunden(anfrage, antwort, einst)

    const basis = basisVon(anfrage)
    const bloecke = mitBildern(r.blocks_render || [], await bilderZu(db, [r]))
    const terme = (await termeZu(db, [r.id])).get(r.id) || []
    r.kategorien = terme.filter(t => t.taxonomy === 'category').map(t => t.name)
    r.schlagwoerter = terme.filter(t => t.taxonomy === 'tag').map(t => t.name)
    const beschreibung = beschreibungVon(r)
    const bild = medienAdresse(r.media_filename) || bloecke.find(b => b.bild)?.bild?.url || null
    const beitraege = bloecke.some(b => b.typ === 'beitraege') ? await neuesteBeitraege(9) : []
    // Die Seite, die als Startseite gewählt ist, steht kanonisch unter /
    const kanonisch = pfad || (typ === 'page' && slug === einst.startseite ? '/' : `/${typ === 'post' ? 'beitrag' : 'seite'}/${slug}`)

    const mitHero = bloecke[0]?.typ === 'hero'
    let kopf = ''
    if (!mitHero) {
      kopf = `<h1>${esc(r.title)}</h1>`
      if (typ === 'post') {
        kopf += `<p><time datetime="${new Date(r.published_at).toISOString()}">${new Date(r.published_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}</time>`
          + (r.author_name ? ` · ${esc(r.author_name)}` : '') + '</p>'
      }
      if (r.media_filename) kopf += `<img src="${esc(medienAdresse(r.media_filename))}" alt="${esc(r.media_alt)}">`
    }
    const fuss = typ === 'post' && terme.length
      ? `<p>${terme.filter(t => t.taxonomy === 'category').map(t => `<a href="/kategorie/${esc(t.slug)}">${esc(t.name)}</a>`).join(' · ')}`
        + ` ${terme.filter(t => t.taxonomy === 'tag').map(t => `#${esc(t.name)}`).join(' ')}</p>`
      : ''
    const inhalt = `<article>${kopf}${bloeckeHtml(bloecke, { h1AusHero: mitHero, beitraege })}${fuss}</article>`

    const istStart = kanonisch === '/'
    const titel = r.seo_titel || (istStart ? [einst.title, einst.tagline].filter(Boolean).join(' – ') : `${r.title} · ${einst.title}`)
    const jsonLd = [ldInhalt(basis, einst, { ...r, slug: istStart ? '' : r.slug }, beschreibung, bild)]
    if (istStart) jsonLd.unshift(ldWebsite(basis, einst))
    else jsonLd.push(ldPfad(basis, [['Start', '/'], ...(typ === 'post' ? [['Blog', einst.startseite ? '/blog' : '/']] : []), [r.title, kanonisch]]))
    if (istStart) jsonLd[1].url = `${basis}/`

    const html = seiteHtml(ladeVorlage(), basis, einst, {
      titel, ogTitel: r.seo_titel || r.title, beschreibung, pfad: kanonisch, bild, noindex: r.noindex,
      typ: typ === 'post' ? 'article' : 'website',
      veroeffentlicht: typ === 'post' ? r.published_at : null, geaendert: typ === 'post' ? r.updated_at : null, jsonLd,
    }, inhalt)
    return senden(antwort, html)
  }

  // Liste der Beiträge (Blog, Kategorie, Startseite ohne gewählte Seite)
  async function listeSeite(anfrage, antwort, { pfad, titel, h1, kategorie = null, einst }) {
    const basis = basisVon(anfrage)
    const beitraege = await neuesteBeitraege(30, kategorie)
    const inhalt = `<h1>${esc(h1)}</h1>` + (beitraege.length
      ? `<ul>${beitraege.map(p => `<li><h2><a href="/beitrag/${esc(p.slug)}">${esc(p.title)}</a></h2>`
        + `<p>${esc(beschreibungVon(p))}</p></li>`).join('')}</ul>`
      : '<p>Noch keine Beiträge veröffentlicht.</p>')
    const jsonLd = pfad === '/' ? [ldWebsite(basis, einst)] : [ldPfad(basis, [['Start', '/'], [h1, pfad]])]
    return senden(antwort, seiteHtml(ladeVorlage(), basis, einst, { titel, beschreibung: kuerzen(einst.tagline), pfad, jsonLd }, inhalt))
  }

  const slugParam = { type: 'object', properties: { slug: { type: 'string', pattern: '^[a-z0-9-]{1,80}$' } }, required: ['slug'] }

  app.get('/', async (anfrage, antwort) => {
    const einst = await einstellungen()
    if (einst.startseite) {
      const ergebnis = await inhaltSeite(anfrage, antwort, 'page', einst.startseite, { pfad: '/', startseite: true })
      if (ergebnis !== null) return ergebnis
    }
    return listeSeite(anfrage, antwort, { pfad: '/', titel: [einst.title, einst.tagline].filter(Boolean).join(' – '), h1: einst.title, einst })
  })

  app.get('/blog', async (anfrage, antwort) => {
    const einst = await einstellungen()
    return listeSeite(anfrage, antwort, { pfad: '/blog', titel: `Blog · ${einst.title}`, h1: 'Blog', einst })
  })

  app.get('/kategorie/:slug', { schema: { params: slugParam } }, async (anfrage, antwort) => {
    const einst = await einstellungen()
    const { rows: [k] } = await db.query("SELECT name, slug FROM terms WHERE taxonomy = 'category' AND slug = $1", [anfrage.params.slug])
    if (!k) return nichtGefunden(anfrage, antwort, einst)
    return listeSeite(anfrage, antwort, { pfad: `/kategorie/${k.slug}`, titel: `${k.name} · ${einst.title}`, h1: k.name, kategorie: k.slug, einst })
  })

  app.get('/seite/:slug', { schema: { params: slugParam } }, (anfrage, antwort) => inhaltSeite(anfrage, antwort, 'page', anfrage.params.slug))
  app.get('/beitrag/:slug', { schema: { params: slugParam } }, (anfrage, antwort) => inhaltSeite(anfrage, antwort, 'post', anfrage.params.slug))

  // ---------- Für Crawler ----------

  app.get('/sitemap.xml', async (anfrage, antwort) => {
    const basis = basisVon(anfrage)
    const einst = await einstellungen()
    const { rows } = await db.query(
      "SELECT type, slug, updated_at FROM posts WHERE status = 'published' AND NOT noindex ORDER BY type DESC, menu_order, published_at DESC")
    const { rows: kategorien } = await db.query(
      `SELECT DISTINCT t.slug FROM terms t JOIN post_terms pt ON pt.term_id = t.id JOIN posts p ON p.id = pt.post_id
       WHERE t.taxonomy = 'category' AND p.status = 'published' AND p.type = 'post' ORDER BY t.slug`)
    const juengste = rows.reduce((m, r) => (!m || r.updated_at > m ? r.updated_at : m), null)
    const eintraege = [
      { loc: `${basis}/`, lastmod: juengste },
      ...(einst.startseite ? [{ loc: `${basis}/blog` }] : []),
      ...rows.filter(r => !(r.type === 'page' && r.slug === einst.startseite))
        .map(r => ({ loc: `${basis}/${r.type === 'post' ? 'beitrag' : 'seite'}/${r.slug}`, lastmod: r.updated_at })),
      ...kategorien.map(k => ({ loc: `${basis}/kategorie/${k.slug}` })),
    ]
    return antwort.type('application/xml; charset=utf-8').header('Cache-Control', 'public, max-age=300').send(sitemapXml(eintraege))
  })

  // Suchmaschinen und KI-Crawler (GPTBot, ClaudeBot, PerplexityBot, Google-Extended …) sind ausdrücklich willkommen.
  app.get('/robots.txt', async (anfrage, antwort) => {
    const basis = basisVon(anfrage)
    const text = ['User-agent: *', 'Allow: /', 'Disallow: /admin', 'Disallow: /admin/', '', `Sitemap: ${basis}/sitemap.xml`, ''].join('\n')
    return antwort.type('text/plain; charset=utf-8').header('Cache-Control', 'public, max-age=3600').send(text)
  })

  // llms.txt (llmstxt.org): Überblick in Markdown für Sprachmodelle
  app.get('/llms.txt', async (anfrage, antwort) => {
    const basis = basisVon(anfrage)
    const einst = await einstellungen()
    const { rows: seiten } = await db.query(
      `SELECT title, slug, excerpt, seo_beschreibung, blocks_render FROM posts
       WHERE type = 'page' AND status = 'published' AND NOT noindex ORDER BY menu_order, title`)
    const beitraege = await neuesteBeitraege(50)
    const zeile = (titel, url, r) => {
      const b = beschreibungVon(r)
      return `- [${einzeilig(titel).replace(/[[\]]/g, '')}](${url})${b ? `: ${b}` : ''}`
    }
    const text = [
      `# ${einst.title}`, '',
      ...(einst.tagline ? [`> ${einzeilig(einst.tagline)}`, ''] : []),
      ...(seiten.length ? ['## Seiten', '', ...seiten.map(s => zeile(s.title, s.slug === einst.startseite ? `${basis}/` : `${basis}/seite/${s.slug}`, s)), ''] : []),
      ...(beitraege.length ? ['## Beiträge', '', ...beitraege.map(p => zeile(p.title, `${basis}/beitrag/${p.slug}`, p)), ''] : []),
      '## Optional', '',
      `- [REST-API, alle Beiträge als JSON](${basis}/api/v1/posts)`,
      `- [RSS-Feed](${basis}/feed.xml)`, '',
    ].join('\n')
    return antwort.type('text/plain; charset=utf-8').header('Cache-Control', 'public, max-age=300').send(text)
  })

  app.get('/feed.xml', async (anfrage, antwort) => {
    const basis = basisVon(anfrage)
    const einst = await einstellungen()
    const beitraege = (await neuesteBeitraege(20)).map(p => ({ ...p, beschreibung: beschreibungVon(p) }))
    return antwort.type('application/rss+xml; charset=utf-8').header('Cache-Control', 'public, max-age=300').send(rssXml(basis, einst, beitraege))
  })
}
