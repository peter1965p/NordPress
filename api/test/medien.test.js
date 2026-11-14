import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { starteTestumgebung, PNG, multipart } from './hilfe.js'

const umgebungen = []
after(() => Promise.all(umgebungen.map(u => u.beenden())))

async function umgebung(optionen) {
  const u = await starteTestumgebung(optionen)
  umgebungen.push(u)
  await u.benutzer('admin@example.org', 'admin')
  await u.benutzer('autor@example.org', 'author')
  return u
}

test('lokal: Bild hochladen, als Beitragsbild setzen und ausliefern', async () => {
  const u = await umgebung()
  const admin = await u.anmelden('admin@example.org')
  const m = multipart('datei', 'foto.png', PNG, { alt: 'Ein Pixel' })
  const r = await admin('POST', '/admin/api/media', m.payload, { headers: m.headers })
  assert.equal(r.statusCode, 201)
  const medium = r.json()
  assert.match(medium.filename, /^[a-f0-9]{24}\.png$/)
  assert.equal(medium.alt, 'Ein Pixel')

  const b = (await admin('POST', '/admin/api/posts', { type: 'post', title: 'Mit Bild', status: 'published', featured_media_id: medium.id })).json()
  const o = (await u.app.inject({ method: 'GET', url: `/api/v1/posts/${b.slug}` })).json()
  assert.deepEqual(o.featured_media, { url: medium.url, alt: 'Ein Pixel' })

  const bild = await u.app.inject({ method: 'GET', url: medium.url })
  assert.equal(bild.statusCode, 200)
  assert.equal(bild.headers['content-type'], 'image/png')
  assert.ok(bild.rawPayload.equals(PNG))
})

test('Dateityp wird am Inhalt erkannt, nicht am Namen', async () => {
  const u = await umgebung()
  const admin = await u.anmelden('admin@example.org')
  const m = multipart('datei', 'harmlos.png', Buffer.from('<?php system($_GET[1]); ?>'))
  assert.equal((await admin('POST', '/admin/api/media', m.payload, { headers: m.headers })).statusCode, 415)
  assert.equal((await u.app.inject({ method: 'GET', url: '/uploads/..%2F..%2Fetc%2Fpasswd' })).statusCode, 404)
})

test('Autor darf fremde Medien nicht löschen', async () => {
  const u = await umgebung()
  const admin = await u.anmelden('admin@example.org')
  const autor = await u.anmelden('autor@example.org')
  const m = multipart('datei', 'a.png', PNG)
  const medium = (await admin('POST', '/admin/api/media', m.payload, { headers: m.headers })).json()
  assert.equal((await autor('DELETE', `/admin/api/media/${medium.id}`)).statusCode, 403)
  assert.equal((await admin('DELETE', `/admin/api/media/${medium.id}`)).statusCode, 200)
  assert.equal((await u.app.inject({ method: 'GET', url: medium.url })).statusCode, 404)
})

test('S3: Ablage unter Präfix, Auslieferung per signiertem Link, Löschen im Bucket', async () => {
  const befehle = []
  const s3Client = {
    config: {},
    async send(befehl) { befehle.push({ name: befehl.constructor.name, input: befehl.input }); return {} },
  }
  const u = await umgebung({ speicher: 's3', s3Client })
  const admin = await u.anmelden('admin@example.org')
  const m = multipart('datei', 'b.png', PNG)
  const medium = (await admin('POST', '/admin/api/media', m.payload, { headers: m.headers })).json()

  const put = befehle.find(b => b.name === 'PutObjectCommand')
  assert.equal(put.input.Bucket, 'test-bucket')
  assert.equal(put.input.Key, `media/${medium.filename}`)
  assert.equal(put.input.ContentType, 'image/png')

  await admin('DELETE', `/admin/api/media/${medium.id}`)
  const del = befehle.find(b => b.name === 'DeleteObjectCommand')
  assert.equal(del.input.Key, `media/${medium.filename}`)
})

test('S3: Resend-Key liegt verschlüsselt unter geheim/, getrennt von den Medien', async () => {
  const befehle = []
  const s3Client = {
    config: {},
    async send(befehl) {
      befehle.push({ name: befehl.constructor.name, input: befehl.input })
      if (befehl.constructor.name === 'GetObjectCommand') throw Object.assign(new Error('fehlt'), { name: 'NoSuchKey' })
      return {}
    },
  }
  const u = await umgebung({ speicher: 's3', s3Client })
  const admin = await u.anmelden('admin@example.org')
  assert.equal((await admin('GET', '/admin/api/settings')).json().mail.resend.gesetzt, false)
  const r = await admin('PUT', '/admin/api/settings', { resend_key: 're_Test1234_abcdefgh' })
  assert.equal(r.statusCode, 200, r.body)
  const put = befehle.find(b => b.name === 'PutObjectCommand')
  assert.equal(put.input.Key, 'geheim/resend.json')
  assert.equal(put.input.ServerSideEncryption, 'AES256')
  assert.equal(JSON.parse(put.input.Body).key, 're_Test1234_abcdefgh')

  // Darf der Server nicht schreiben, sagt der Admin es deutlich
  s3Client.send = async () => { throw Object.assign(new Error('Access Denied'), { name: 'AccessDenied' }) }
  const fehl = await admin('PUT', '/admin/api/settings', { resend_key: 're_Test1234_neuneuneu' })
  assert.equal(fehl.statusCode, 502)
  assert.match(fehl.json().fehler, /geheim\//)
})
