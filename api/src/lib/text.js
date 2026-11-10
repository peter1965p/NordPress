import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'

const UMLAUTE = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss', Ä: 'ae', Ö: 'oe', Ü: 'ue' }

export function slugify(text) {
  return String(text)
    .replace(/[äöüßÄÖÜ]/g, z => UMLAUTE[z])
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'eintrag'
}

// Sucht den ersten freien Slug: titel, titel-2, titel-3 ...
export async function freierSlug(db, sql, basis, params, ausserId = null) {
  let slug = basis, n = 1
  for (;;) {
    const { rows } = await db.query(sql, [...params, slug, ausserId])
    if (rows.length === 0) return slug
    slug = `${basis}-${++n}`
  }
}

const ERLAUBT = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'del']),
  allowedAttributes: {
    a: ['href', 'title'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    code: ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  allowProtocolRelative: false,
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
    img: sanitizeHtml.simpleTransform('img', { loading: 'lazy' }),
  },
}

// Markdown wird beim Speichern einmal gerendert und bereinigt. Die API liefert nur noch sicheres HTML aus.
export function markdownZuHtml(md) {
  return sanitizeHtml(marked.parse(String(md || ''), { async: false }), ERLAUBT)
}
