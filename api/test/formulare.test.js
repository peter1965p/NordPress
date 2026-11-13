import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { starteTestumgebung } from './hilfe.js'

let u, admin, autor
before(async () => {
  u = await starteTestumgebung({ konfig: { formularLimit: 10 } })
  await u.benutzer('admin@example.org', 'admin')
  await u.benutzer('autor@example.org', 'author')
  admin = await u.anmelden('admin@example.org')
  autor = await u.anmelden('autor@example.org')
})
after(() => u.beenden())

const KONTAKT = {
  name: 'Kontakt',
  felder: [
    { id: 'name', typ: 'text', label: 'Name', pflicht: true, breite: 'halb' },
    { id: 'email', typ: 'email', label: 'E-Mail', pflicht: true, breite: 'halb' },
    { id: 'thema', typ: 'auswahl', label: 'Thema', optionen: ['Website', 'App'] },
    { id: 'nachricht', typ: 'textarea', label: 'Nachricht', pflicht: true },
    { id: 'datenschutz', typ: 'checkbox', label: 'Ich stimme der [Datenschutzerklärung](/seite/datenschutz) zu', pflicht: true },
  ],
  absenden_text: 'Nachricht senden',
}

const senden = (formId, body) => u.app.inject({ method: 'POST', url: `/api/v1/forms/${formId}/einsendungen`, payload: body })
const gueltig = { name: 'Erika', email: 'erika@example.org', thema: 'App', nachricht: 'Hallo!', datenschutz: true }

async function neuesFormular(f = KONTAKT) {
  const r = await admin('POST', '/admin/api/forms', f)
  assert.equal(r.statusCode, 201, r.body)
  return r.json().id
}

test('Formular anlegen, öffentlich abrufen, absenden, im Admin lesen', async () => {
  const id = await neuesFormular()

  const oeff = (await u.app.inject({ method: 'GET', url: `/api/v1/forms/${id}` })).json()
  assert.equal(oeff.absenden_text, 'Nachricht senden')
  assert.equal(oeff.erfolg_text, 'Danke! Wir melden uns so schnell wie möglich.', 'Standardtext')
  assert.deepEqual(oeff.felder.map(f => f.id), ['name', 'email', 'thema', 'nachricht', 'datenschutz'])
  assert.deepEqual(oeff.felder[2].optionen, ['Website', 'App'])
  assert.equal(oeff.felder[0].optionen, undefined, 'Optionen nur bei Auswahlfeldern')

  const r = await senden(id, { werte: { ...gueltig, nachricht: '  Hallo!  ' } })
  assert.equal(r.statusCode, 201, r.body)
  assert.equal(r.json().nachricht, oeff.erfolg_text)
  assert.equal(r.headers['cache-control'], 'no-store')

  const liste = (await admin('GET', '/admin/api/forms')).json().items
  assert.deepEqual(liste.map(f => [f.name, f.anzahl, f.ungelesen, f.feldzahl]), [['Kontakt', 1, 1, 5]])

  const [e] = (await admin('GET', `/admin/api/forms/${id}/einsendungen`)).json().items
  assert.equal(e.gelesen, false)
  assert.deepEqual(e.daten.find(d => d.id === 'nachricht'), { id: 'nachricht', label: 'Nachricht', typ: 'textarea', wert: 'Hallo!' })

  assert.equal((await admin('PUT', `/admin/api/einsendungen/${e.id}`, { gelesen: true })).statusCode, 200)
  assert.equal((await admin('GET', '/admin/api/forms')).json().items[0].ungelesen, 0)
})

test('Einsendungen werden geprüft', async () => {
  const id = await neuesFormular()
  const fehler = async (werte, muster) => {
    const r = await senden(id, { werte })
    assert.equal(r.statusCode, 400, r.body)
    assert.match(r.json().fehler, muster)
  }
  await fehler({ ...gueltig, name: '   ' }, /Name: Pflichtfeld/)
  await fehler({ ...gueltig, email: 'keine-mail' }, /E-Mail: keine gültige/)
  await fehler({ ...gueltig, thema: 'Etwas anderes' }, /Thema: ungültige Auswahl/)
  await fehler({ ...gueltig, datenschutz: false }, /bitte bestätigen/)
  const { rows } = await u.pool.query('SELECT count(*)::int AS n FROM form_submissions WHERE form_id = $1', [id])
  assert.equal(rows[0].n, 0)
})

test('Bots, die das versteckte Feld füllen, bekommen Erfolg, aber nichts wird gespeichert', async () => {
  const id = await neuesFormular()
  const r = await senden(id, { werte: gueltig, website: 'https://spam.example' })
  assert.equal(r.statusCode, 200)
  const { rows } = await u.pool.query('SELECT count(*)::int AS n FROM form_submissions WHERE form_id = $1', [id])
  assert.equal(rows[0].n, 0)
})

test('Formular prüft doppelte Feld-IDs und leere Auswahl, Autoren dürfen nicht', async () => {
  const doppelt = await admin('POST', '/admin/api/forms', { name: 'X', felder: [KONTAKT.felder[0], KONTAKT.felder[0]] })
  assert.equal(doppelt.statusCode, 400)
  assert.match(doppelt.json().fehler, /doppelt/)
  const leer = await admin('POST', '/admin/api/forms', { name: 'X', felder: [{ id: 'a', typ: 'auswahl', label: 'A' }] })
  assert.match(leer.json().fehler, /mindestens eine Option/)
  assert.equal((await autor('GET', '/admin/api/forms')).statusCode, 403)
  assert.equal((await autor('POST', '/admin/api/forms', KONTAKT)).statusCode, 403)
})

test('Block „Formular“ in einer Seite, Löschen des Formulars nimmt Einsendungen mit', async () => {
  const id = await neuesFormular()
  const r = await admin('POST', '/admin/api/posts', {
    type: 'page', title: 'Kontakt', status: 'published',
    blocks: [{ id: 'f', typ: 'formular', formular_id: id, titel: 'Schreib uns', hintergrund: 'hell' }],
  })
  assert.equal(r.statusCode, 201, r.body)
  const [b] = (await u.app.inject({ method: 'GET', url: `/api/v1/pages/${r.json().slug}` })).json().blocks
  assert.deepEqual(b, { id: 'f', typ: 'formular', formular_id: id, titel: 'Schreib uns', hintergrund: 'hell' })

  await senden(id, { werte: gueltig })
  assert.equal((await admin('DELETE', `/admin/api/forms/${id}`)).statusCode, 200)
  assert.equal((await u.app.inject({ method: 'GET', url: `/api/v1/forms/${id}` })).statusCode, 404)
  const { rows } = await u.pool.query('SELECT count(*)::int AS n FROM form_submissions WHERE form_id = $1', [id])
  assert.equal(rows[0].n, 0)
})

test('Formular in einer Karte', async () => {
  const id = await neuesFormular()
  const r = await admin('POST', '/admin/api/posts', {
    type: 'page', title: 'Details', status: 'published',
    blocks: [{ id: 'k', typ: 'karten', eintraege: [
      { icon: 'mail', titel: 'Kontakt', text: 'Schreib uns', formular_id: id },
      { icon: 'seite', titel: 'Impressum', link: '/seite/impressum' },
    ] }],
  })
  assert.equal(r.statusCode, 201, r.body)
  const [b] = (await u.app.inject({ method: 'GET', url: `/api/v1/pages/${r.json().slug}` })).json().blocks
  assert.equal(b.eintraege[0].formular_id, id)
  assert.equal(b.eintraege[1].formular_id, undefined)
})

test('Schalter: Ja/Nein wie ein Häkchen, Pflicht muss an sein', async () => {
  const id = await neuesFormular({ name: 'Newsletter', felder: [
    { id: 'name', typ: 'text', label: 'Name' },
    { id: 'news', typ: 'schalter', label: 'Newsletter abonnieren' },
    { id: 'agb', typ: 'schalter', label: 'AGB akzeptiert', pflicht: true },
  ] })
  assert.equal((await senden(id, { werte: { name: 'A', news: true, agb: false } })).statusCode, 400, 'Pflicht-Schalter aus')
  assert.equal((await senden(id, { werte: { name: 'A', news: 'ja', agb: true } })).statusCode, 400, 'nur true/false')
  const ok = await senden(id, { werte: { name: 'A', agb: true } }); assert.equal(ok.statusCode, 201, ok.body)
  const [e] = (await admin('GET', `/admin/api/forms/${id}/einsendungen`)).json().items
  assert.deepEqual(e.daten.filter(d => d.typ === 'schalter').map(d => d.wert), [false, true])
})

test('Drossel: nach zu vielen Einsendungen in 10 Minuten ist Schluss', async () => {
  const id = await neuesFormular()
  // Andere Tests haben schon gesendet, deshalb bis zur Drossel zählen
  let r
  for (let i = 0; i < 20 && r?.statusCode !== 429; i++) r = await senden(id, { werte: gueltig })
  assert.equal(r.statusCode, 429)
})

