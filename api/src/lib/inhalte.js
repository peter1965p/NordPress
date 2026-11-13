// Gemeinsame Abfragen für Beiträge und Seiten (Admin und öffentliche API).
import { bildIds, mitBildern } from './bloecke.js'

export const medienAdresse = dateiname => (dateiname ? `/uploads/${dateiname}` : null)

export async function termeZu(db, postIds) {
  if (postIds.length === 0) return new Map()
  const { rows } = await db.query(
    `SELECT pt.post_id, t.id, t.taxonomy, t.name, t.slug FROM post_terms pt JOIN terms t ON t.id = pt.term_id
     WHERE pt.post_id = ANY($1::bigint[]) ORDER BY t.name`, [postIds])
  const karte = new Map()
  for (const r of rows) {
    if (!karte.has(r.post_id)) karte.set(r.post_id, [])
    karte.get(r.post_id).push({ id: Number(r.id), taxonomy: r.taxonomy, name: r.name, slug: r.slug })
  }
  return karte
}

export const BEITRAG_SPALTEN = `p.id, p.type, p.title, p.slug, p.excerpt, p.content, p.content_html, p.blocks, p.blocks_render, p.status, p.menu_order,
  p.created_at, p.updated_at, p.published_at, p.author_id, u.name AS author_name, p.seo_titel, p.seo_beschreibung, p.noindex,
  p.featured_media_id, m.filename AS media_filename, m.alt AS media_alt`

export const BEITRAG_JOINS = 'FROM posts p LEFT JOIN users u ON u.id = p.author_id LEFT JOIN media m ON m.id = p.featured_media_id'

// Bilder aller Blöcke der Zeilen mit einer Abfrage holen
export async function bilderZu(db, rows) {
  const ids = [...new Set(rows.flatMap(r => bildIds(r.blocks_render || [])))]
  if (ids.length === 0) return new Map()
  const { rows: m } = await db.query('SELECT id, filename, alt FROM media WHERE id = ANY($1::bigint[])', [ids])
  return new Map(m.map(x => [Number(x.id), { url: medienAdresse(x.filename), alt: x.alt }]))
}

// Öffentliche Form: ohne Markdown-Quelle, ohne interne IDs von Benutzern.
export function oeffentlich(r, terme = [], bilder = new Map()) {
  return {
    id: Number(r.id),
    type: r.type,
    title: r.title,
    slug: r.slug,
    excerpt: r.excerpt,
    content_html: r.content_html,
    blocks: mitBildern(r.blocks_render || [], bilder),
    published_at: r.published_at,
    updated_at: r.updated_at,
    menu_order: r.menu_order,
    author: r.author_name ? { name: r.author_name } : null,
    featured_media: r.media_filename ? { url: medienAdresse(r.media_filename), alt: r.media_alt } : null,
    categories: terme.filter(t => t.taxonomy === 'category').map(({ name, slug }) => ({ name, slug })),
    tags: terme.filter(t => t.taxonomy === 'tag').map(({ name, slug }) => ({ name, slug })),
    seo: { titel: r.seo_titel || null, beschreibung: r.seo_beschreibung || null, noindex: !!r.noindex },
  }
}

export function intern(r, terme = []) {
  return {
    id: Number(r.id),
    type: r.type,
    title: r.title,
    slug: r.slug,
    excerpt: r.excerpt,
    content: r.content,
    blocks: r.blocks || [],
    status: r.status,
    menu_order: r.menu_order,
    created_at: r.created_at,
    updated_at: r.updated_at,
    published_at: r.published_at,
    author_id: r.author_id ? Number(r.author_id) : null,
    author_name: r.author_name,
    featured_media_id: r.featured_media_id ? Number(r.featured_media_id) : null,
    featured_media_url: medienAdresse(r.media_filename),
    term_ids: terme.map(t => t.id),
    terms: terme,
    seo_titel: r.seo_titel,
    seo_beschreibung: r.seo_beschreibung,
    noindex: r.noindex,
  }
}
