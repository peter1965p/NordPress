import { leseTheme } from '../lib/theme.js'
import { BEITRAG_JOINS, BEITRAG_SPALTEN, bilderZu, oeffentlich, termeZu } from '../lib/inhalte.js'

// Öffentliche, lesende REST-API (vergleichbar mit wp-json). Liefert nur Veröffentlichtes.
export default async function lieferRouten(app) {
  app.addHook('onSend', async (anfrage, antwort, nutzlast) => {
    antwort.header('Access-Control-Allow-Origin', '*')
    antwort.header('Cache-Control', 'public, max-age=60')
    return nutzlast
  })

  app.get('/settings', async () => {
    const { rows } = await app.db.query("SELECT key, value FROM settings WHERE key IN ('title', 'tagline', 'theme', 'startseite')")
    const e = Object.fromEntries(rows.map(r => [r.key, r.value]))
    return { title: e.title, tagline: e.tagline, theme: leseTheme(e.theme), startseite: e.startseite || '' }
  })

  app.get('/posts', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          per_page: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
          category: { type: 'string', maxLength: 80 },
          tag: { type: 'string', maxLength: 80 },
          search: { type: 'string', maxLength: 100 },
        },
      },
    },
  }, async anfrage => {
    const { page, per_page, category, tag, search } = anfrage.query
    const bedingungen = ["p.type = 'post'", "p.status = 'published'"]
    const werte = []
    for (const [taxonomie, slug] of [['category', category], ['tag', tag]]) {
      if (!slug) continue
      werte.push(taxonomie, slug)
      bedingungen.push(`EXISTS (SELECT 1 FROM post_terms pt JOIN terms t ON t.id = pt.term_id
        WHERE pt.post_id = p.id AND t.taxonomy = $${werte.length - 1} AND t.slug = $${werte.length})`)
    }
    if (search) {
      werte.push(`%${search.replace(/[\\%_]/g, z => '\\' + z)}%`)
      bedingungen.push(`(p.title ILIKE $${werte.length} OR p.such_text ILIKE $${werte.length})`)
    }
    const wo = bedingungen.join(' AND ')
    const gesamt = Number((await app.db.query(`SELECT count(*) FROM posts p WHERE ${wo}`, werte)).rows[0].count)
    const { rows } = await app.db.query(
      `SELECT ${BEITRAG_SPALTEN} ${BEITRAG_JOINS} WHERE ${wo}
       ORDER BY p.published_at DESC, p.id DESC LIMIT $${werte.length + 1} OFFSET $${werte.length + 2}`,
      [...werte, per_page, (page - 1) * per_page])
    const terme = await termeZu(app.db, rows.map(r => r.id))
    const bilder = await bilderZu(app.db, rows)
    return { items: rows.map(r => oeffentlich(r, terme.get(r.id), bilder)), total: gesamt, page, per_page }
  })

  for (const [pfad, typ] of [['posts', 'post'], ['pages', 'page']]) {
    app.get(`/${pfad}/:slug`, async (anfrage, antwort) => {
      const { rows } = await app.db.query(
        `SELECT ${BEITRAG_SPALTEN} ${BEITRAG_JOINS} WHERE p.type = $1 AND p.slug = $2 AND p.status = 'published'`,
        [typ, anfrage.params.slug])
      if (!rows[0]) return antwort.code(404).send({ fehler: 'Nicht gefunden' })
      const terme = await termeZu(app.db, [rows[0].id])
      return oeffentlich(rows[0], terme.get(rows[0].id), await bilderZu(app.db, rows))
    })
  }

  app.get('/pages', async () => {
    const { rows } = await app.db.query(
      "SELECT title, slug, menu_order FROM posts WHERE type = 'page' AND status = 'published' ORDER BY menu_order, title")
    return { items: rows }
  })

  for (const [pfad, taxonomie] of [['categories', 'category'], ['tags', 'tag']]) {
    app.get(`/${pfad}`, async () => {
      const { rows } = await app.db.query(
        `SELECT t.name, t.slug, count(p.id)::int AS count FROM terms t
         LEFT JOIN post_terms pt ON pt.term_id = t.id
         LEFT JOIN posts p ON p.id = pt.post_id AND p.status = 'published' AND p.type = 'post'
         WHERE t.taxonomy = $1 GROUP BY t.id ORDER BY t.name`, [taxonomie])
      return { items: rows }
    })
  }
}
