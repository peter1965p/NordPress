import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const MIGRATIONEN = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations')

export function erstellePool(k) {
  let ssl = false
  if (k.dbSsl === 'require') ssl = { rejectUnauthorized: false }
  if (k.dbSsl === 'verify') ssl = { rejectUnauthorized: true, ca: fs.readFileSync(k.dbSslCa, 'utf8') }
  return new pg.Pool({ connectionString: k.datenbank, ssl, max: 10 })
}

// Spielt alle noch fehlenden SQL-Dateien aus migrations/ der Reihe nach ein, jede in einer eigenen Transaktion.
export async function migriere(pool) {
  await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())')
  const erledigt = new Set((await pool.query('SELECT name FROM schema_migrations')).rows.map(r => r.name))
  const dateien = fs.readdirSync(MIGRATIONEN).filter(d => d.endsWith('.sql')).sort()
  const neu = []
  for (const datei of dateien) {
    if (erledigt.has(datei)) continue
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(fs.readFileSync(path.join(MIGRATIONEN, datei), 'utf8'))
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [datei])
      await client.query('COMMIT')
      neu.push(datei)
    } catch (e) {
      await client.query('ROLLBACK')
      throw new Error(`Migration ${datei} fehlgeschlagen: ${e.message}`)
    } finally {
      client.release()
    }
  }
  return neu
}
