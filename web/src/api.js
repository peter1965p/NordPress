import { reactive } from 'vue'

export class ApiFehler extends Error {
  constructor(status, text) { super(text); this.status = status }
}

async function anfrage(methode, url, daten) {
  const optionen = { method: methode, credentials: 'same-origin', headers: { 'X-Nordpress': '1' } }
  if (daten instanceof FormData) optionen.body = daten
  else if (daten !== undefined) {
    optionen.headers['Content-Type'] = 'application/json'
    optionen.body = JSON.stringify(daten)
  }
  const r = await fetch(url, optionen)
  const inhalt = r.headers.get('content-type')?.includes('json') ? await r.json() : null
  if (!r.ok) {
    if (r.status === 401 && sitzung.benutzer) sitzung.benutzer = null
    // Bei Prüffehlern sagt details, welches Feld (z. B. body/blocks/2/eintraege/0/link)
    throw new ApiFehler(r.status, [inhalt?.fehler || `Fehler ${r.status}`, inhalt?.details].filter(Boolean).join(': '))
  }
  return inhalt
}

export const admin = {
  get: url => anfrage('GET', '/admin/api' + url),
  post: (url, d = {}) => anfrage('POST', '/admin/api' + url, d),
  put: (url, d) => anfrage('PUT', '/admin/api' + url, d),
  del: url => anfrage('DELETE', '/admin/api' + url),
}

export const oeffentlich = url => anfrage('GET', '/api/v1' + url)
export const oeffentlichSenden = (url, daten) => anfrage('POST', '/api/v1' + url, daten)

export const sitzung = reactive({ benutzer: null, geprueft: false })

export async function pruefeSitzung() {
  if (sitzung.geprueft) return sitzung.benutzer
  try { sitzung.benutzer = await admin.get('/me') } catch { sitzung.benutzer = null }
  sitzung.geprueft = true
  return sitzung.benutzer
}

export const RANG = { author: 1, editor: 2, admin: 3 }
export const darf = rolle => !!sitzung.benutzer && RANG[sitzung.benutzer.role] >= RANG[rolle]
export const ROLLEN = { admin: 'Administrator', editor: 'Redakteur', author: 'Autor' }

export function datum(wert, mitZeit = false) {
  if (!wert) return '–'
  return new Date(wert).toLocaleString('de-DE', mitZeit
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'long', year: 'numeric' })
}

// Kleine Meldungen oben rechts
export const meldungen = reactive([])
export function melde(text, art = 'ok') {
  const m = { id: Math.random(), text, art }
  meldungen.push(m)
  setTimeout(() => meldungen.splice(meldungen.indexOf(m), 1), 3500)
}
