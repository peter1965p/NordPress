// SEO und GEO: Seiten fertig als HTML für Suchmaschinen und KI-Crawler, die kein JavaScript ausführen.
// Die Vue-App übernimmt danach wie gewohnt. Alles hier ist reine Textverarbeitung ohne Datenbank.

export const esc = s => String(s ?? '').replace(/[&<>"']/g, z => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[z])
const ohneTags = html => String(html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
export const einzeilig = s => String(s || '').replace(/\s+/g, ' ').trim()

// Kürzt an einer Wortgrenze, Suchmaschinen zeigen etwa 155 Zeichen
export function kuerzen(text, max = 160) {
  const t = einzeilig(text)
  if (t.length <= max) return t
  const schnitt = t.slice(0, max - 1)
  return schnitt.slice(0, Math.max(schnitt.lastIndexOf(' '), max - 20)).replace(/[\s,.;:–-]+$/, '') + '…'
}

const absolut = (basis, pfad) => (!pfad ? null : /^https?:\/\//.test(pfad) ? pfad : basis + pfad)

// JSON in <script>: </script> und <!-- dürfen nicht vorkommen
const jsonLd = obj => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`

// ---------- Blöcke als einfaches, semantisches HTML ----------

function link(href, text) {
  return `<a href="${esc(href)}">${esc(text)}</a>`
}

// h1Vergeben: Beginnt der Inhalt mit einem Hero, ist dessen Titel die Hauptüberschrift (wie in der Vue-App)
export function bloeckeHtml(bloecke, { h1AusHero = false, beitraege = [] } = {}) {
  return bloecke.map((b, i) => {
    switch (b.typ) {
      case 'markdown':
      case 'text':
        return b.html || ''
      case 'hero': {
        const h = h1AusHero && i === 0 ? 'h1' : 'h2'
        return `<section>${b.eyebrow ? `<p>${esc(b.eyebrow)}</p>` : ''}<${h}>${b.titel_html}</${h}>`
          + (b.untertitel ? `<p><strong>${esc(b.untertitel)}</strong></p>` : '')
          + (b.text ? `<p>${esc(b.text)}</p>` : '')
          + (b.bild ? `<img src="${esc(b.bild.url)}" alt="${esc(b.bild.alt)}">` : '')
          + (b.buttons?.length ? `<p>${b.buttons.map(k => link(k.link, k.text)).join(' · ')}</p>` : '')
          + (b.hinweis ? `<p><small>${esc(b.hinweis)}</small></p>` : '')
          + '</section>'
      }
      case 'buttons':
        return `<p>${b.eintraege.map(k => link(k.link, k.text)).join(' · ')}</p>`
      case 'iconliste':
        return `<section>${b.titel ? `<h2>${esc(b.titel)}</h2>` : ''}<ul>${b.eintraege.map(e => `<li>${esc(e.text)}</li>`).join('')}</ul></section>`
      case 'karten':
        return `<section>${b.titel ? `<h2>${esc(b.titel)}</h2>` : ''}${b.untertitel ? `<p>${esc(b.untertitel)}</p>` : ''}<ul>`
          + b.eintraege.map(e => `<li><h3>${e.link ? link(e.link, e.titel) : esc(e.titel)}</h3>${e.text ? `<p>${esc(e.text)}</p>` : ''}</li>`).join('')
          + '</ul></section>'
      case 'code':
        return `<figure>${b.dateiname ? `<figcaption>${esc(b.dateiname)}</figcaption>` : ''}<pre><code>${esc(b.quelle)}</code></pre></figure>`
      case 'beitraege':
        return `<section>${b.titel ? `<h2>${esc(b.titel)}</h2>` : ''}<ul>`
          + beitraege.slice(0, b.anzahl || 3).map(p => `<li>${link(`/beitrag/${p.slug}`, p.title)}</li>`).join('')
          + `</ul><p>${link('/blog', 'Alle Beiträge')}</p></section>`
      case 'formular':
        return b.titel || b.text ? `<section>${b.titel ? `<h2>${esc(b.titel)}</h2>` : ''}${b.text ? `<p>${esc(b.text)}</p>` : ''}</section>` : ''
      default:
        return ''
    }
  }).join('\n')
}

// Erster sinnvoller Text eines Inhalts, für die Beschreibung, wenn keine gesetzt ist
export function textAnfang(bloecke) {
  for (const b of bloecke) {
    const t = b.html ? ohneTags(b.html) : b.typ === 'hero' ? [b.untertitel, b.text].filter(Boolean).join('. ') : ''
    if (einzeilig(t).length > 40) return einzeilig(t)
  }
  return ''
}

// ---------- Seite zusammensetzen ----------

// meta: { titel, beschreibung, pfad, bild, typ: 'website' | 'article', noindex, status, jsonLd: [...] }
// inhalt: HTML für <div id="app">
export function seiteHtml(vorlage, basis, einst, meta, inhalt) {
  const url = basis + meta.pfad
  const bild = absolut(basis, meta.bild)
  const kopf = [
    `<title>${esc(meta.titel)}</title>`,
    meta.beschreibung ? `<meta name="description" content="${esc(meta.beschreibung)}">` : '',
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta name="robots" content="${meta.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1'}">`,
    `<meta property="og:site_name" content="${esc(einst.title)}">`,
    `<meta property="og:locale" content="de_DE">`,
    `<meta property="og:type" content="${meta.typ || 'website'}">`,
    `<meta property="og:title" content="${esc(meta.ogTitel || meta.titel)}">`,
    meta.beschreibung ? `<meta property="og:description" content="${esc(meta.beschreibung)}">` : '',
    `<meta property="og:url" content="${esc(url)}">`,
    bild ? `<meta property="og:image" content="${esc(bild)}">` : '',
    `<meta name="twitter:card" content="${bild ? 'summary_large_image' : 'summary'}">`,
    meta.veroeffentlicht ? `<meta property="article:published_time" content="${new Date(meta.veroeffentlicht).toISOString()}">` : '',
    meta.geaendert ? `<meta property="article:modified_time" content="${new Date(meta.geaendert).toISOString()}">` : '',
    `<link rel="alternate" type="application/rss+xml" title="${esc(einst.title)}" href="${esc(basis)}/feed.xml">`,
    ...(meta.jsonLd || []).map(jsonLd),
  ].filter(Boolean).join('\n    ')

  // Seitenkopf mit Navigation, damit Crawler alle Seiten über Links finden
  const nav = [link('/', 'Start'), ...(einst.startseite ? [link('/blog', 'Blog')] : []),
    ...einst.seiten.filter(s => s.slug !== einst.startseite).map(s => link(`/seite/${s.slug}`, s.title))].join(' · ')
  const app = `<div id="app"><div class="mx-auto max-w-3xl px-6 py-10">`
    + `<header><p><a href="/"><strong>${esc(einst.title)}</strong></a>${einst.tagline ? ` – ${esc(einst.tagline)}` : ''}</p><nav>${nav}</nav></header>`
    + `<main class="prose prose-gray max-w-none dark:prose-invert">${inhalt}</main></div></div>`

  return vorlage
    .replace(/<title>[^<]*<\/title>/, kopf)
    .replace('<div id="app"></div>', app)
}

// ---------- JSON-LD (schema.org) ----------

export function ldOrganisation(basis, einst) {
  return { '@type': 'Organization', '@id': `${basis}/#organisation`, name: einst.title, url: `${basis}/` }
}

export function ldWebsite(basis, einst) {
  return {
    '@context': 'https://schema.org', '@type': 'WebSite', '@id': `${basis}/#website`, url: `${basis}/`, name: einst.title,
    ...(einst.tagline ? { description: einst.tagline } : {}), inLanguage: 'de-DE', publisher: ldOrganisation(basis, einst),
  }
}

export function ldInhalt(basis, einst, r, beschreibung, bild) {
  const url = `${basis}/${r.type === 'post' ? 'beitrag' : 'seite'}/${r.slug}`
  const gemeinsam = {
    '@context': 'https://schema.org', url, name: r.title, inLanguage: 'de-DE',
    ...(beschreibung ? { description: beschreibung } : {}), ...(bild ? { image: absolut(basis, bild) } : {}),
    isPartOf: { '@id': `${basis}/#website` },
  }
  if (r.type !== 'post') return { ...gemeinsam, '@type': 'WebPage', dateModified: new Date(r.updated_at).toISOString() }
  return {
    ...gemeinsam, '@type': 'BlogPosting', headline: r.title, mainEntityOfPage: url,
    datePublished: new Date(r.published_at).toISOString(), dateModified: new Date(r.updated_at).toISOString(),
    ...(r.author_name ? { author: { '@type': 'Person', name: r.author_name } } : {}),
    publisher: ldOrganisation(basis, einst),
    ...(r.kategorien?.length ? { articleSection: r.kategorien.join(', ') } : {}),
    ...(r.schlagwoerter?.length ? { keywords: r.schlagwoerter.join(', ') } : {}),
  }
}

export function ldPfad(basis, teile) {
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: teile.map(([name, pfad], i) => ({ '@type': 'ListItem', position: i + 1, name, item: basis + pfad })),
  }
}

// ---------- Sitemap, RSS ----------

export function sitemapXml(eintraege) {
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + eintraege.map(e => `  <url><loc>${esc(e.loc)}</loc>${e.lastmod ? `<lastmod>${new Date(e.lastmod).toISOString()}</lastmod>` : ''}</url>`).join('\n')
    + '\n</urlset>\n'
}

export function rssXml(basis, einst, beitraege) {
  const cdata = s => `<![CDATA[${String(s).replaceAll(']]>', ']]]]><![CDATA[>')}]]>`
  return '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n'
    + `<title>${esc(einst.title)}</title>\n<link>${esc(basis)}/</link>\n<description>${esc(einst.tagline || einst.title)}</description>\n<language>de-de</language>\n`
    + `<atom:link href="${esc(basis)}/feed.xml" rel="self" type="application/rss+xml"/>\n`
    + beitraege.map(p => {
      const url = `${basis}/beitrag/${p.slug}`
      return `<item><title>${esc(p.title)}</title><link>${esc(url)}</link><guid isPermaLink="true">${esc(url)}</guid>`
        + `<pubDate>${new Date(p.published_at).toUTCString()}</pubDate>`
        + (p.author_name ? `<dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/">${esc(p.author_name)}</dc:creator>` : '')
        + `<description>${cdata(p.beschreibung)}</description>`
        + (p.content_html ? `<content:encoded xmlns:content="http://purl.org/rss/1.0/modules/content/">${cdata(p.content_html)}</content:encoded>` : '')
        + '</item>'
    }).join('\n')
    + '\n</channel>\n</rss>\n'
}
