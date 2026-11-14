import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import { erstellePool, migriere } from './db.js'
import { erstelleSpeicher } from './lib/speicher.js'
import { erstelleMailer } from './lib/mail.js'
import { ladeBenutzer } from './auth.js'
import adminRouten from './routes/admin.js'
import lieferRouten from './routes/liefer.js'
import seitenRouten from './routes/seite.js'

// Baut die Anwendung, ohne zu lauschen. Tests rufen sie mit app.inject() auf.
export async function baueApp(konfig, { pool = null, s3Client = null, sesClient = null, abrufen = fetch } = {}) {
  const app = Fastify({
    logger: konfig.logger ? { level: 'info', redact: ['req.headers.cookie', 'req.headers.authorization'] } : false,
    // Nur dem eigenen nginx auf derselben Maschine glauben. Mit `true` könnte jeder Client per
    // X-Forwarded-For eine beliebige IP vortäuschen und so die Login-Drossel umgehen.
    trustProxy: 'loopback',
    bodyLimit: 1024 * 1024,
    // Unbekannte Felder ablehnen statt still zu entfernen
    ajv: { customOptions: { removeAdditional: false, discriminator: true } },
  })
  app.decorate('konfig', konfig)
  app.decorate('db', pool || erstellePool(konfig))
  app.decorate('speicher', erstelleSpeicher(konfig, s3Client))
  app.decorate('mailer', erstelleMailer(konfig, { ses: sesClient, speicher: app.speicher, db: app.db, abrufen }))
  app.decorateRequest('benutzer', null)

  await app.register(helmet, { contentSecurityPolicy: false })
  await app.register(cookie)
  await app.register(rateLimit, { global: false })
  await app.register(multipart, { limits: { fileSize: konfig.maxUploadMb * 1024 * 1024, files: 1, fields: 5 } })

  app.addHook('onClose', async () => { if (!pool) await app.db.end() })

  app.get('/health', async () => {
    await app.db.query('SELECT 1')
    return { ok: true }
  })

  // Medien: lokal direkt aus dem Ordner, bei S3 Weiterleitung auf einen 5 Minuten gültigen signierten Link.
  app.get('/uploads/:name', async (anfrage, antwort) => {
    const name = anfrage.params.name
    if (!/^[a-f0-9]{24}\.(jpg|png|gif|webp)$/.test(name)) return antwort.code(404).send({ fehler: 'Nicht gefunden' })
    const { rows } = await app.db.query('SELECT mime FROM media WHERE filename = $1', [name])
    if (!rows[0]) return antwort.code(404).send({ fehler: 'Nicht gefunden' })
    const ziel = await app.speicher.adresse(name)
    if (ziel) return antwort.header('Cache-Control', 'private, max-age=240').redirect(ziel, 302)
    antwort.header('Cache-Control', 'public, max-age=31536000, immutable')
    return antwort.type(rows[0].mime).send(await app.speicher.lesen(name))
  })

  // Vor den Routen setzen: Fastify vererbt den Handler nur an Plugins, die danach registriert werden.
  app.setErrorHandler((fehler, anfrage, antwort) => {
    if (fehler.validation) return antwort.code(400).send({ fehler: 'Ungültige Eingabe', details: fehler.message })
    if (fehler.statusCode === 429) return antwort.code(429).send({ fehler: 'Zu viele Versuche, bitte später erneut' })
    if (fehler.code === 'FST_REQ_FILE_TOO_LARGE') return antwort.code(413).send({ fehler: `Datei größer als ${konfig.maxUploadMb} MB` })
    if (fehler.code === '23505') return antwort.code(409).send({ fehler: 'Eintrag existiert bereits' })
    if (fehler.statusCode && fehler.statusCode < 500) return antwort.code(fehler.statusCode).send({ fehler: fehler.message })
    anfrage.log.error(fehler)
    return antwort.code(500).send({ fehler: 'Interner Fehler' })
  })

  await app.register(lieferRouten, { prefix: '/api/v1' })
  await app.register(async admin => {
    admin.addHook('onRequest', async (anfrage, antwort) => {
      // Schutz gegen CSRF: Änderungen nur mit eigenem Header. Fremde Seiten können ihn ohne CORS-Freigabe nicht setzen.
      if (!['GET', 'HEAD', 'OPTIONS'].includes(anfrage.method) && anfrage.headers['x-nordpress'] !== '1') {
        return antwort.code(403).send({ fehler: 'Header X-Nordpress fehlt' })
      }
      anfrage.benutzer = await ladeBenutzer(app, anfrage)
    })
    await admin.register(adminRouten)
  }, { prefix: '/admin/api' })
  // Öffentliche Seiten als HTML für Suchmaschinen, dazu sitemap.xml, robots.txt, llms.txt, feed.xml
  await app.register(seitenRouten)

  return app
}

export { migriere }
