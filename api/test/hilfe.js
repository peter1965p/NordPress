// Startet für jede Testdatei eine eigene, leere PostgreSQL in einem Temp-Ordner (nur Unix-Socket, kein TCP-Port nach außen).
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import pg from 'pg'
import { baueApp, migriere } from '../src/app.js'
import { ladeKonfiguration } from '../src/config.js'
import { hashePasswort } from '../src/lib/passwort.js'

export async function starteTestumgebung({ speicher = 'local', s3Client = null, sesClient = null, abrufen = fetch, konfig: extra = {} } = {}) {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'nordpress-test-'))
  const daten = path.join(ordner, 'daten')
  const port = 20000 + Math.floor(Math.random() * 20000)
  execFileSync('initdb', ['-D', daten, '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--no-sync'], { stdio: 'ignore' })
  execFileSync('pg_ctl', ['-D', daten, '-w', '-l', path.join(ordner, 'log'),
    '-o', `-k ${ordner} -p ${port} -c listen_addresses='' -c fsync=off`, 'start'], { stdio: 'ignore' })

  const pool = new pg.Pool({ host: ordner, port, user: 'postgres', database: 'postgres' })
  await migriere(pool)
  const konfig = ladeKonfiguration({
    logger: false, cookieSicher: false, speicher, uploadOrdner: path.join(ordner, 'uploads'), geheimOrdner: path.join(ordner, 'geheim'),
    s3Bucket: 'test-bucket', s3Praefix: 'media/', ...extra,
  })
  const app = await baueApp(konfig, { pool, s3Client, sesClient, abrufen })

  async function benutzer(email, rolle, passwort = 'geheim-genug-123') {
    const { rows } = await pool.query(
      'INSERT INTO users (email, name, role, password_hash) VALUES ($1, $2, $3, $4) RETURNING id',
      [email, email.split('@')[0], rolle, await hashePasswort(passwort)])
    return Number(rows[0].id)
  }

  // Meldet an und liefert eine Funktion, die Anfragen mit Cookie und CSRF-Header schickt.
  async function anmelden(email, passwort = 'geheim-genug-123') {
    const r = await app.inject({ method: 'POST', url: '/admin/api/login', headers: { 'x-nordpress': '1' }, payload: { email, password: passwort } })
    if (r.statusCode !== 200) throw new Error(`Anmeldung fehlgeschlagen: ${r.body}`)
    const cookie = r.cookies.find(c => c.name === 'np_sid')
    return (method, url, payload, extra = {}) => app.inject({
      method, url, payload, ...extra,
      headers: { cookie: `np_sid=${cookie.value}`, 'x-nordpress': '1', ...(extra.headers || {}) },
    })
  }

  async function beenden() {
    await app.close()
    await pool.end()
    execFileSync('pg_ctl', ['-D', daten, '-m', 'immediate', 'stop'], { stdio: 'ignore' })
    fs.rmSync(ordner, { recursive: true, force: true })
  }

  return { app, pool, benutzer, anmelden, beenden }
}

// Kleinstes gültiges PNG (1x1 Pixel)
export const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

export function multipart(feldname, dateiname, inhalt, felder = {}) {
  const grenze = '----nordpress' + Math.random().toString(16).slice(2)
  const teile = []
  for (const [k, v] of Object.entries(felder)) {
    teile.push(Buffer.from(`--${grenze}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`))
  }
  teile.push(Buffer.from(`--${grenze}\r\nContent-Disposition: form-data; name="${feldname}"; filename="${dateiname}"\r\nContent-Type: application/octet-stream\r\n\r\n`))
  teile.push(inhalt, Buffer.from(`\r\n--${grenze}--\r\n`))
  return { payload: Buffer.concat(teile), headers: { 'content-type': `multipart/form-data; boundary=${grenze}` } }
}
