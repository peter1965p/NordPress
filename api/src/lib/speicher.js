import fs from 'node:fs/promises'
import path from 'node:path'
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'

const geheimName = name => { if (!/^[a-z0-9-]+\.json$/.test(name)) throw new Error('Ungültiger Name'); return name }
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Zwei Speicher mit derselben Schnittstelle: lokal (Entwicklung, Tests) und S3 (Server).
// Auf EC2 holt das SDK die Zugangsdaten selbst über die IAM-Rolle der Instanz (IMDSv2), es gibt keine Schlüssel in Dateien.

export function erstelleSpeicher(k, s3Client = null) {
  if (k.speicher === 's3') return s3Speicher(k, s3Client || new S3Client({ region: k.s3Region }))
  return lokalerSpeicher(k)
}

function lokalerSpeicher(k) {
  const ordner = path.resolve(k.uploadOrdner)
  return {
    art: 'local',
    async ablegen(name, inhalt) {
      await fs.mkdir(ordner, { recursive: true })
      await fs.writeFile(path.join(ordner, name), inhalt, { flag: 'wx' })
    },
    async loeschen(name) {
      await fs.rm(path.join(ordner, path.basename(name)), { force: true })
    },
    async lesen(name) {
      return fs.readFile(path.join(ordner, path.basename(name)))
    },
    async adresse() { return null },
    async geheimLesen(name) {
      try { return await fs.readFile(path.join(path.resolve(k.geheimOrdner), geheimName(name)), 'utf8') } catch (e) { if (e.code === 'ENOENT') return null; throw e }
    },
    async geheimAblegen(name, text) {
      const g = path.resolve(k.geheimOrdner)
      await fs.mkdir(g, { recursive: true, mode: 0o700 })
      await fs.writeFile(path.join(g, geheimName(name)), text, { mode: 0o600 })
    },
    async geheimLoeschen(name) {
      await fs.rm(path.join(path.resolve(k.geheimOrdner), geheimName(name)), { force: true })
    },
  }
}

function s3Speicher(k, client) {
  const schluessel = name => k.s3Praefix + path.basename(name)
  return {
    art: 's3',
    async ablegen(name, inhalt, mime) {
      await client.send(new PutObjectCommand({
        Bucket: k.s3Bucket, Key: schluessel(name), Body: inhalt, ContentType: mime,
        CacheControl: 'public, max-age=31536000, immutable',
      }))
    },
    async loeschen(name) {
      await client.send(new DeleteObjectCommand({ Bucket: k.s3Bucket, Key: schluessel(name) }))
    },
    async lesen() { throw new Error('Im S3-Modus wird per signiertem Link ausgeliefert') },
    // Kurzlebiger signierter Link: Der Bucket bleibt privat, es gibt keine öffentliche Bucket-Policy.
    async adresse(name) {
      return getSignedUrl(client, new GetObjectCommand({ Bucket: k.s3Bucket, Key: schluessel(name) }), { expiresIn: 300 })
    },
    // Geheimnisse: eigenes Präfix, verschlüsselt abgelegt, nie signiert ausgeliefert
    async geheimLesen(name) {
      try {
        const r = await client.send(new GetObjectCommand({ Bucket: k.s3Bucket, Key: k.s3GeheimPraefix + geheimName(name) }))
        return await r.Body.transformToString()
      } catch (e) {
        if (e.name === 'NoSuchKey') return null
        throw e
      }
    },
    async geheimAblegen(name, text) {
      await client.send(new PutObjectCommand({
        Bucket: k.s3Bucket, Key: k.s3GeheimPraefix + geheimName(name), Body: text,
        ContentType: 'application/json', ServerSideEncryption: 'AES256', CacheControl: 'no-store',
      }))
    },
    async geheimLoeschen(name) {
      await client.send(new DeleteObjectCommand({ Bucket: k.s3Bucket, Key: k.s3GeheimPraefix + geheimName(name) }))
    },
  }
}

// Bildtyp aus den ersten Bytes, nicht aus Dateiname oder Content-Type des Browsers.
export function erkenneBild(b) {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: 'image/jpeg', endung: 'jpg' }
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', endung: 'png' }
  if (b.length >= 6 && ['GIF87a', 'GIF89a'].includes(b.subarray(0, 6).toString('latin1'))) return { mime: 'image/gif', endung: 'gif' }
  if (b.length >= 12 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP') return { mime: 'image/webp', endung: 'webp' }
  return null
}
