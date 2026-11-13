import crypto from 'node:crypto'
import path from 'node:path'
import { braucht, istMindestens, starteSitzung, beendeSitzung } from '../auth.js'
import { ATTRAPPE, hashePasswort, pruefePasswort, pruefePasswortRegel } from '../lib/passwort.js'
import { freierSlug, slugify } from '../lib/text.js'
import { leseTheme, themeSchema } from '../lib/theme.js'
import { ausMarkdown, bloeckeSchema, nurMarkdown, verarbeite } from '../lib/bloecke.js'
import { BEITRAG_JOINS, BEITRAG_SPALTEN, intern, medienAdresse, termeZu } from '../lib/inhalte.js'
import { erkenneBild } from '../lib/speicher.js'
import { formularSchema, pruefeFormular } from '../lib/formulare.js'

const id = { type: 'object', properties: { id: { type: 'integer', minimum: 1 } }, required: ['id'] }
const fehler = (antwort, code, text) => antwort.code(code).send({ fehler: text })

export default async function adminRouten(app) {
  const db = app.db

  // ---------- Anmeldung ----------

  app.post('/login', {
    config: { rateLimit: { max: 10, timeWindow: '15 minutes' } },
    schema: {
      body: {
        type: 'object', required: ['email', 'password'],
        properties: { email: { type: 'string', maxLength: 200 }, password: { type: 'string', maxLength: 200 } },
      },
    },
  }, async (anfrage, antwort) => {
    const email = anfrage.body.email.trim().toLowerCase()
    const { rows } = await db.query('SELECT id, password_hash FROM users WHERE email = $1', [email])
    const ok = await pruefePasswort(anfrage.body.password, rows[0]?.password_hash || ATTRAPPE)
    if (!rows[0] || !ok) {
      anfrage.log.warn({ email }, 'Anmeldung fehlgeschlagen')
      return fehler(antwort, 401, 'E-Mail oder Passwort falsch')
    }
    await db.query('DELETE FROM sessions WHERE expires_at < now()')
    await starteSitzung(app, antwort, rows[0].id)
    return { ok: true }
  })

  app.post('/logout', async (anfrage, antwort) => {
    await beendeSitzung(app, anfrage, antwort)
    return { ok: true }
  })

  app.get('/me', { preHandler: braucht() }, async anfrage => anfrage.benutzer)

  // ---------- Beiträge und Seiten ----------

  // Autoren sehen und bearbeiten nur eigene Beiträge und keine Seiten.
  function darfBearbeiten(benutzer, beitrag) {
    if (istMindestens(benutzer, 'editor')) return true
    return beitrag.type === 'post' && Number(beitrag.author_id) === Number(benutzer.id)
  }

  async function ladeBeitrag(beitragId) {
    const { rows } = await db.query(`SELECT ${BEITRAG_SPALTEN} ${BEITRAG_JOINS} WHERE p.id = $1`, [beitragId])
    if (!rows[0]) return null
    const terme = await termeZu(db, [rows[0].id])
    return intern(rows[0], terme.get(rows[0].id))
  }

  app.get('/posts', {
    preHandler: braucht(),
    schema: {
      querystring: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['post', 'page'], default: 'post' },
          status: { type: 'string', enum: ['draft', 'published'] },
          search: { type: 'string', maxLength: 100 },
          page: { type: 'integer', minimum: 1, default: 1 },
        },
      },
    },
  }, async (anfrage, antwort) => {
    const { type, status, search, page } = anfrage.query
    const b = anfrage.benutzer
    if (type === 'page' && !istMindestens(b, 'editor')) return fehler(antwort, 403, 'Keine Berechtigung')
    const werte = [type]
    const bed = ['p.type = $1']
    if (status) { werte.push(status); bed.push(`p.status = $${werte.length}`) }
    if (search) { werte.push(`%${search.replace(/[\\%_]/g, z => '\\' + z)}%`); bed.push(`p.title ILIKE $${werte.length}`) }
    if (!istMindestens(b, 'editor')) { werte.push(b.id); bed.push(`p.author_id = $${werte.length}`) }
    const wo = bed.join(' AND ')
    const gesamt = Number((await db.query(`SELECT count(*) FROM posts p WHERE ${wo}`, werte)).rows[0].count)
    const { rows } = await db.query(
      `SELECT ${BEITRAG_SPALTEN} ${BEITRAG_JOINS} WHERE ${wo}
       ORDER BY ${type === 'page' ? 'p.menu_order, p.title' : 'p.updated_at DESC'} LIMIT 20 OFFSET $${werte.length + 1}`,
      [...werte, (page - 1) * 20])
    const terme = await termeZu(db, rows.map(r => r.id))
    return { items: rows.map(r => intern(r, terme.get(r.id))), total: gesamt, page, per_page: 20 }
  })

  app.get('/posts/:id', { preHandler: braucht(), schema: { params: id } }, async (anfrage, antwort) => {
    const beitrag = await ladeBeitrag(anfrage.params.id)
    if (!beitrag) return fehler(antwort, 404, 'Nicht gefunden')
    if (!darfBearbeiten(anfrage.benutzer, beitrag)) return fehler(antwort, 403, 'Keine Berechtigung')
    return beitrag
  })

  const beitragSchema = {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['post', 'page'] },
      title: { type: 'string', minLength: 1, maxLength: 200 },
      slug: { type: 'string', maxLength: 80 },
      excerpt: { type: 'string', maxLength: 1000 },
      content: { type: 'string', maxLength: 200000 },   // bisherige Oberfläche: wird zu einem Markdown-Block
      blocks: bloeckeSchema,
      status: { type: 'string', enum: ['draft', 'published'] },
      featured_media_id: { type: ['integer', 'null'], minimum: 1 },
      menu_order: { type: 'integer', minimum: -1000, maximum: 1000 },
      term_ids: { type: 'array', items: { type: 'integer', minimum: 1 }, maxItems: 50 },
      seo_titel: { type: 'string', maxLength: 120 },
      seo_beschreibung: { type: 'string', maxLength: 300 },
      noindex: { type: 'boolean' },
    },
    additionalProperties: false,
  }

  async function speichereTerme(client, beitragId, termIds) {
    if (!termIds) return
    await client.query('DELETE FROM post_terms WHERE post_id = $1', [beitragId])
    if (termIds.length) {
      await client.query(
        'INSERT INTO post_terms (post_id, term_id) SELECT $1, id FROM terms WHERE id = ANY($2::bigint[])',
        [beitragId, termIds])
    }
  }

  const SLUG_FREI = 'SELECT 1 FROM posts WHERE type = $1 AND slug = $2 AND id IS DISTINCT FROM $3'

  app.post('/posts', {
    preHandler: braucht(),
    schema: { body: { ...beitragSchema, required: ['type', 'title'] } },
  }, async (anfrage, antwort) => {
    const e = anfrage.body
    const b = anfrage.benutzer
    if (e.type === 'page' && !istMindestens(b, 'editor')) return fehler(antwort, 403, 'Seiten dürfen nur Redakteure anlegen')
    if (e.content !== undefined && e.blocks !== undefined) return fehler(antwort, 400, 'Entweder content oder blocks, nicht beides')
    const v = verarbeite(e.blocks ?? ausMarkdown(e.content))
    const slug = await freierSlug(db, SLUG_FREI, slugify(e.slug || e.title), [e.type])
    const status = e.status || 'draft'
    const client = await db.connect()
    try {
      await client.query('BEGIN')
      const { rows } = await client.query(
        `INSERT INTO posts (type, title, slug, excerpt, content, content_html, status, author_id, featured_media_id, menu_order, published_at,
           blocks, blocks_render, such_text, seo_titel, seo_beschreibung, noindex)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CASE WHEN $7 = 'published' THEN now() END, $11, $12, $13, $14, $15, $16) RETURNING id`,
        [e.type, e.title, slug, e.excerpt || '', v.content, v.content_html, status, b.id,
          e.featured_media_id || null, e.menu_order || 0, JSON.stringify(v.blocks), JSON.stringify(v.blocks_render), v.such_text,
          e.seo_titel || '', e.seo_beschreibung || '', !!e.noindex])
      await speichereTerme(client, rows[0].id, e.term_ids)
      await client.query('COMMIT')
      return antwort.code(201).send(await ladeBeitrag(rows[0].id))
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  })

  app.put('/posts/:id', {
    preHandler: braucht(),
    schema: { params: id, body: beitragSchema },
  }, async (anfrage, antwort) => {
    const alt = await ladeBeitrag(anfrage.params.id)
    if (!alt) return fehler(antwort, 404, 'Nicht gefunden')
    if (!darfBearbeiten(anfrage.benutzer, alt)) return fehler(antwort, 403, 'Keine Berechtigung')
    const e = { ...alt, ...anfrage.body, type: alt.type }
    const neu = anfrage.body
    if (neu.content !== undefined && neu.blocks !== undefined) return fehler(antwort, 400, 'Entweder content oder blocks, nicht beides')
    // Die bisherige Oberfläche kennt nur Markdown. Sie darf eine Seite aus Blöcken nicht überschreiben.
    if (neu.content !== undefined && !nurMarkdown(alt.blocks)) {
      return fehler(antwort, 409, 'Dieser Inhalt besteht aus Blöcken und kann nur im Block-Editor bearbeitet werden')
    }
    const v = verarbeite(neu.blocks ?? (neu.content !== undefined ? ausMarkdown(neu.content) : alt.blocks))
    const slug = anfrage.body.slug !== undefined || anfrage.body.title !== undefined
      ? await freierSlug(db, SLUG_FREI, slugify(anfrage.body.slug || alt.slug), [alt.type], alt.id)
      : alt.slug
    const client = await db.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `UPDATE posts SET title = $2, slug = $3, excerpt = $4, content = $5, content_html = $6, status = $7,
           featured_media_id = $8, menu_order = $9, blocks = $10, blocks_render = $11, such_text = $12, updated_at = now(),
           seo_titel = $13, seo_beschreibung = $14, noindex = $15,
           published_at = CASE WHEN $7 = 'published' THEN COALESCE(published_at, now()) ELSE NULL END
         WHERE id = $1`,
        [alt.id, e.title, slug, e.excerpt, v.content, v.content_html, e.status,
          e.featured_media_id || null, e.menu_order, JSON.stringify(v.blocks), JSON.stringify(v.blocks_render), v.such_text,
          e.seo_titel || '', e.seo_beschreibung || '', !!e.noindex])
      await speichereTerme(client, alt.id, anfrage.body.term_ids)
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
    return ladeBeitrag(alt.id)
  })

  app.delete('/posts/:id', { preHandler: braucht(), schema: { params: id } }, async (anfrage, antwort) => {
    const alt = await ladeBeitrag(anfrage.params.id)
    if (!alt) return fehler(antwort, 404, 'Nicht gefunden')
    if (!darfBearbeiten(anfrage.benutzer, alt)) return fehler(antwort, 403, 'Keine Berechtigung')
    await db.query('DELETE FROM posts WHERE id = $1', [alt.id])
    return { ok: true }
  })

  // ---------- Kategorien und Schlagwörter ----------

  app.get('/terms', {
    preHandler: braucht(),
    schema: { querystring: { type: 'object', properties: { taxonomy: { type: 'string', enum: ['category', 'tag'] } } } },
  }, async anfrage => {
    const { rows } = await db.query(
      `SELECT t.id::int, t.taxonomy, t.name, t.slug, count(pt.post_id)::int AS count FROM terms t
       LEFT JOIN post_terms pt ON pt.term_id = t.id
       WHERE $1::text IS NULL OR t.taxonomy = $1 GROUP BY t.id ORDER BY t.name`, [anfrage.query.taxonomy || null])
    return { items: rows }
  })

  const termSchema = {
    type: 'object',
    properties: {
      taxonomy: { type: 'string', enum: ['category', 'tag'] },
      name: { type: 'string', minLength: 1, maxLength: 80 },
      slug: { type: 'string', maxLength: 80 },
    },
    additionalProperties: false,
  }
  const TERM_FREI = 'SELECT 1 FROM terms WHERE taxonomy = $1 AND slug = $2 AND id IS DISTINCT FROM $3'

  // Autoren dürfen Schlagwörter anlegen (wie bei WordPress), Kategorien nur Redakteure.
  app.post('/terms', {
    preHandler: braucht(),
    schema: { body: { ...termSchema, required: ['taxonomy', 'name'] } },
  }, async (anfrage, antwort) => {
    const { taxonomy, name } = anfrage.body
    if (taxonomy === 'category' && !istMindestens(anfrage.benutzer, 'editor')) return fehler(antwort, 403, 'Keine Berechtigung')
    const slug = await freierSlug(db, TERM_FREI, slugify(anfrage.body.slug || name), [taxonomy])
    const { rows } = await db.query(
      'INSERT INTO terms (taxonomy, name, slug) VALUES ($1, $2, $3) RETURNING id::int, taxonomy, name, slug',
      [taxonomy, name.trim(), slug])
    return antwort.code(201).send(rows[0])
  })

  app.put('/terms/:id', { preHandler: braucht('editor'), schema: { params: id, body: termSchema } }, async (anfrage, antwort) => {
    const { rows: [alt] } = await db.query('SELECT * FROM terms WHERE id = $1', [anfrage.params.id])
    if (!alt) return fehler(antwort, 404, 'Nicht gefunden')
    const name = anfrage.body.name?.trim() || alt.name
    const slug = await freierSlug(db, TERM_FREI, slugify(anfrage.body.slug || alt.slug), [alt.taxonomy], alt.id)
    const { rows } = await db.query(
      'UPDATE terms SET name = $2, slug = $3 WHERE id = $1 RETURNING id::int, taxonomy, name, slug', [alt.id, name, slug])
    return rows[0]
  })

  app.delete('/terms/:id', { preHandler: braucht('editor'), schema: { params: id } }, async anfrage => {
    await db.query('DELETE FROM terms WHERE id = $1', [anfrage.params.id])
    return { ok: true }
  })

  // ---------- Mediathek ----------

  const medium = r => ({ ...r, id: Number(r.id), url: medienAdresse(r.filename) })

  app.get('/media', { preHandler: braucht() }, async () => {
    const { rows } = await db.query(
      `SELECT m.id, m.filename, m.original_name, m.mime, m.size, m.alt, m.created_at, m.uploaded_by::int, u.name AS uploaded_by_name
       FROM media m LEFT JOIN users u ON u.id = m.uploaded_by ORDER BY m.created_at DESC LIMIT 200`)
    return { items: rows.map(medium) }
  })

  app.post('/media', { preHandler: braucht() }, async (anfrage, antwort) => {
    const datei = await anfrage.file()
    if (!datei) return fehler(antwort, 400, 'Keine Datei')
    const inhalt = await datei.toBuffer()
    const art = erkenneBild(inhalt)
    if (!art) return fehler(antwort, 415, 'Nur JPEG, PNG, GIF oder WebP')
    const name = `${crypto.randomBytes(12).toString('hex')}.${art.endung}`
    await app.speicher.ablegen(name, inhalt, art.mime)
    const original = path.basename(datei.filename || 'bild').slice(0, 200)
    const alt = String(datei.fields?.alt?.value || '').slice(0, 300)
    const { rows } = await db.query(
      `INSERT INTO media (filename, original_name, mime, size, alt, uploaded_by) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, filename, original_name, mime, size, alt, created_at, uploaded_by::int`,
      [name, original, art.mime, inhalt.length, alt, anfrage.benutzer.id])
    return antwort.code(201).send(medium(rows[0]))
  })

  app.put('/media/:id', {
    preHandler: braucht(),
    schema: { params: id, body: { type: 'object', required: ['alt'], properties: { alt: { type: 'string', maxLength: 300 } } } },
  }, async (anfrage, antwort) => {
    const { rows: [m] } = await db.query('SELECT * FROM media WHERE id = $1', [anfrage.params.id])
    if (!m) return fehler(antwort, 404, 'Nicht gefunden')
    if (!istMindestens(anfrage.benutzer, 'editor') && Number(m.uploaded_by) !== Number(anfrage.benutzer.id)) {
      return fehler(antwort, 403, 'Keine Berechtigung')
    }
    const { rows } = await db.query('UPDATE media SET alt = $2 WHERE id = $1 RETURNING *', [m.id, anfrage.body.alt])
    return medium(rows[0])
  })

  app.delete('/media/:id', { preHandler: braucht(), schema: { params: id } }, async (anfrage, antwort) => {
    const { rows: [m] } = await db.query('SELECT * FROM media WHERE id = $1', [anfrage.params.id])
    if (!m) return fehler(antwort, 404, 'Nicht gefunden')
    if (!istMindestens(anfrage.benutzer, 'editor') && Number(m.uploaded_by) !== Number(anfrage.benutzer.id)) {
      return fehler(antwort, 403, 'Keine Berechtigung')
    }
    await db.query('DELETE FROM media WHERE id = $1', [m.id])
    await app.speicher.loeschen(m.filename)
    return { ok: true }
  })

  // ---------- Formulare und Einsendungen (ab Redakteur) ----------

  const formular = r => ({ ...r, id: Number(r.id), ...(r.felder ? { mail_aktiv: app.mailer.aktiv } : {}), ...(r.anzahl !== undefined ? { anzahl: r.anzahl, ungelesen: r.ungelesen } : {}) })

  app.get('/forms', { preHandler: braucht('editor') }, async () => {
    const { rows } = await db.query(
      `SELECT f.id, f.name, jsonb_array_length(f.felder)::int AS feldzahl, f.updated_at,
         count(s.id)::int AS anzahl, count(s.id) FILTER (WHERE NOT s.gelesen)::int AS ungelesen,
         max(s.created_at) AS letzte
       FROM forms f LEFT JOIN form_submissions s ON s.form_id = f.id GROUP BY f.id ORDER BY f.name`)
    return { items: rows.map(formular) }
  })

  app.get('/forms/:id', { preHandler: braucht('editor'), schema: { params: id } }, async (anfrage, antwort) => {
    const { rows } = await db.query('SELECT * FROM forms WHERE id = $1', [anfrage.params.id])
    if (!rows[0]) return fehler(antwort, 404, 'Nicht gefunden')
    return formular(rows[0])
  })

  app.post('/forms', { preHandler: braucht('editor'), schema: { body: formularSchema } }, async (anfrage, antwort) => {
    const f = anfrage.body
    const problem = pruefeFormular(f)
    if (problem) return fehler(antwort, 400, problem)
    const { rows } = await db.query(
      `INSERT INTO forms (name, felder, absenden_text, erfolg_text, benachrichtigung)
       VALUES ($1, $2, COALESCE($3, 'Absenden'), COALESCE($4, 'Danke! Wir melden uns so schnell wie möglich.'), COALESCE($5, '')) RETURNING *`,
      [f.name, JSON.stringify(f.felder), f.absenden_text ?? null, f.erfolg_text ?? null, f.benachrichtigung ?? null])
    return antwort.code(201).send(formular(rows[0]))
  })

  app.put('/forms/:id', { preHandler: braucht('editor'), schema: { params: id, body: formularSchema } }, async (anfrage, antwort) => {
    const f = anfrage.body
    const problem = pruefeFormular(f)
    if (problem) return fehler(antwort, 400, problem)
    const { rows } = await db.query(
      `UPDATE forms SET name = $2, felder = $3, absenden_text = COALESCE($4, absenden_text), erfolg_text = COALESCE($5, erfolg_text),
         benachrichtigung = COALESCE($6, benachrichtigung), updated_at = now() WHERE id = $1 RETURNING *`,
      [anfrage.params.id, f.name, JSON.stringify(f.felder), f.absenden_text ?? null, f.erfolg_text ?? null, f.benachrichtigung ?? null])
    if (!rows[0]) return fehler(antwort, 404, 'Nicht gefunden')
    return formular(rows[0])
  })

  app.delete('/forms/:id', { preHandler: braucht('editor'), schema: { params: id } }, async anfrage => {
    await db.query('DELETE FROM forms WHERE id = $1', [anfrage.params.id])
    return { ok: true }
  })

  app.get('/forms/:id/einsendungen', { preHandler: braucht('editor'), schema: { params: id } }, async anfrage => {
    const { rows } = await db.query(
      'SELECT id, daten, gelesen, created_at FROM form_submissions WHERE form_id = $1 ORDER BY created_at DESC LIMIT 500',
      [anfrage.params.id])
    return { items: rows.map(r => ({ ...r, id: Number(r.id) })) }
  })

  app.put('/einsendungen/:id', {
    preHandler: braucht('editor'),
    schema: { params: id, body: { type: 'object', required: ['gelesen'], additionalProperties: false, properties: { gelesen: { type: 'boolean' } } } },
  }, async (anfrage, antwort) => {
    const { rowCount } = await db.query('UPDATE form_submissions SET gelesen = $2 WHERE id = $1', [anfrage.params.id, anfrage.body.gelesen])
    if (!rowCount) return fehler(antwort, 404, 'Nicht gefunden')
    return { ok: true }
  })

  app.delete('/einsendungen/:id', { preHandler: braucht('editor'), schema: { params: id } }, async anfrage => {
    await db.query('DELETE FROM form_submissions WHERE id = $1', [anfrage.params.id])
    return { ok: true }
  })

  // ---------- Benutzer ----------

  const benutzerSchema = {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email', maxLength: 200 },
      name: { type: 'string', minLength: 1, maxLength: 100 },
      role: { type: 'string', enum: ['admin', 'editor', 'author'] },
      password: { type: 'string', maxLength: 200 },
    },
    additionalProperties: false,
  }

  app.get('/users', { preHandler: braucht('admin') }, async () => {
    const { rows } = await db.query('SELECT id::int, email, name, role, created_at FROM users ORDER BY name')
    return { items: rows }
  })

  app.post('/users', {
    preHandler: braucht('admin'),
    schema: { body: { ...benutzerSchema, required: ['email', 'name', 'role', 'password'] } },
  }, async (anfrage, antwort) => {
    const regel = pruefePasswortRegel(anfrage.body.password)
    if (regel) return fehler(antwort, 400, regel)
    const { rows } = await db.query(
      'INSERT INTO users (email, name, role, password_hash) VALUES ($1, $2, $3, $4) RETURNING id::int, email, name, role, created_at',
      [anfrage.body.email.trim().toLowerCase(), anfrage.body.name.trim(), anfrage.body.role, await hashePasswort(anfrage.body.password)])
    return antwort.code(201).send(rows[0])
  })

  app.put('/users/:id', { preHandler: braucht('admin'), schema: { params: id, body: benutzerSchema } }, async (anfrage, antwort) => {
    const { rows: [alt] } = await db.query('SELECT * FROM users WHERE id = $1', [anfrage.params.id])
    if (!alt) return fehler(antwort, 404, 'Nicht gefunden')
    const e = anfrage.body
    if (alt.role === 'admin' && e.role && e.role !== 'admin') {
      const { rows } = await db.query("SELECT count(*)::int AS n FROM users WHERE role = 'admin'")
      if (rows[0].n <= 1) return fehler(antwort, 409, 'Der letzte Administrator kann nicht herabgestuft werden')
    }
    let hash = alt.password_hash
    if (e.password) {
      const regel = pruefePasswortRegel(e.password)
      if (regel) return fehler(antwort, 400, regel)
      hash = await hashePasswort(e.password)
      await db.query('DELETE FROM sessions WHERE user_id = $1', [alt.id])
    }
    const { rows } = await db.query(
      'UPDATE users SET email = $2, name = $3, role = $4, password_hash = $5 WHERE id = $1 RETURNING id::int, email, name, role, created_at',
      [alt.id, (e.email || alt.email).trim().toLowerCase(), (e.name || alt.name).trim(), e.role || alt.role, hash])
    return rows[0]
  })

  app.delete('/users/:id', { preHandler: braucht('admin'), schema: { params: id } }, async (anfrage, antwort) => {
    if (Number(anfrage.params.id) === Number(anfrage.benutzer.id)) return fehler(antwort, 409, 'Sich selbst löschen geht nicht')
    await db.query('DELETE FROM users WHERE id = $1', [anfrage.params.id])
    return { ok: true }
  })

  // ---------- Einstellungen ----------

  const einstellungen = async () => {
    const { rows } = await db.query('SELECT key, value FROM settings')
    const e = Object.fromEntries(rows.map(r => [r.key, r.value]))
    return { ...e, theme: leseTheme(e.theme) }
  }

  app.get('/settings', { preHandler: braucht() }, einstellungen)

  app.put('/settings', {
    preHandler: braucht('admin'),
    schema: {
      body: {
        type: 'object', additionalProperties: false,
        properties: {
          title: { type: 'string', maxLength: 100 },
          tagline: { type: 'string', maxLength: 200 },
          theme: themeSchema,
          startseite: { type: 'string', pattern: '^[a-z0-9-]{0,80}$' },   // Slug einer Seite, leer = neueste Beiträge
        },
      },
    },
  }, async anfrage => {
    for (const [key, value] of Object.entries(anfrage.body)) {
      const text = key === 'theme' ? JSON.stringify(value) : value
      await db.query('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', [key, text])
    }
    return einstellungen()
  })
}
