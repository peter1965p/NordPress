// Legt den ersten Administrator an. Das Passwort wird abgefragt, nicht als Argument übergeben (sonst steht es in der Shell-History).
//   node scripts/admin-anlegen.js admin@example.org "Vorname Nachname"
import { ladeKonfiguration } from '../src/config.js'
import { erstellePool, migriere } from '../src/db.js'
import { hashePasswort, pruefePasswortRegel } from '../src/lib/passwort.js'

const [email, name] = process.argv.slice(2)
if (!email || !name) {
  console.error('Aufruf: node scripts/admin-anlegen.js <email> "<Name>"')
  process.exit(1)
}

// Verdeckte Eingabe im Raw-Modus: das Terminal-Echo ist aus, es wird nichts zurückgeschrieben.
// (Das frühere Überschreiben von readline._writeToOutput greift in neuen Node-Versionen nicht mehr.)
function frage(text) {
  const ein = process.stdin
  if (!ein.isTTY) { console.error('Bitte in einem interaktiven Terminal ausführen.'); process.exit(1) }
  process.stdout.write(text)
  ein.setRawMode(true)
  ein.resume()
  ein.setEncoding('utf8')
  return new Promise(fertig => {
    let antwort = ''
    const taste = s => {
      for (const z of s) {
        if (z === '\r' || z === '\n') {
          ein.setRawMode(false); ein.pause(); ein.off('data', taste)
          process.stdout.write('\n')
          return fertig(antwort)
        }
        if (z === '\u0003') { ein.setRawMode(false); process.stdout.write('\n'); process.exit(130) }
        if (z === '\u007f' || z === '\b') antwort = [...antwort].slice(0, -1).join('')
        else if (z >= ' ') antwort += z
      }
    }
    ein.on('data', taste)
  })
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
