// Legt den ersten Administrator an. Das Passwort wird abgefragt, nicht als Argument übergeben (sonst steht es in der Shell-History).
//   node scripts/admin-anlegen.js admin@example.org "Vorname Nachname"
import readline from 'node:readline/promises'
import { ladeKonfiguration } from '../src/config.js'
import { erstellePool, migriere } from '../src/db.js'
import { hashePasswort, pruefePasswortRegel } from '../src/lib/passwort.js'

const [email, name] = process.argv.slice(2)
if (!email || !name) {
  console.error('Aufruf: node scripts/admin-anlegen.js <email> "<Name>"')
  process.exit(1)
}

async function frage(text) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
  rl._writeToOutput = s => { if (s.includes(text)) process.stdout.write(s) }
  const antwort = await rl.question(text)
  rl.close()
  process.stdout.write('\n')
  return antwort
}

const passwort = await frage('Passwort: ')
const regel = pruefePasswortRegel(passwort)
if (regel) { console.error(regel); process.exit(1) }
if (await frage('Wiederholen: ') !== passwort) { console.error('Passwörter stimmen nicht überein'); process.exit(1) }

const pool = erstellePool(ladeKonfiguration())
await migriere(pool)
await pool.query(
  `INSERT INTO users (email, name, role, password_hash) VALUES ($1, $2, 'admin', $3)
   ON CONFLICT (email) DO UPDATE SET role = 'admin', name = $2, password_hash = $3`,
  [email.trim().toLowerCase(), name.trim(), await hashePasswort(passwort)])
console.log(`Administrator ${email} angelegt.`)
await pool.end()
