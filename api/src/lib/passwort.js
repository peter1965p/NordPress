import crypto from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(crypto.scrypt)
const N = 16384, R = 8, P = 1, LAENGE = 64

// Format: scrypt$N$r$p$salz$hash (beides base64). Kein nativer Zusatz nötig, läuft auf x86 und Arm gleich.
export async function hashePasswort(passwort) {
  const salz = crypto.randomBytes(16)
  const hash = await scrypt(passwort, salz, LAENGE, { N, r: R, p: P })
  return ['scrypt', N, R, P, salz.toString('base64'), hash.toString('base64')].join('$')
}

export async function pruefePasswort(passwort, gespeichert) {
  const [art, n, r, p, salz, hash] = String(gespeichert).split('$')
  if (art !== 'scrypt') return false
  const soll = Buffer.from(hash, 'base64')
  const ist = await scrypt(passwort, Buffer.from(salz, 'base64'), soll.length, { N: Number(n), r: Number(r), p: Number(p) })
  return crypto.timingSafeEqual(soll, ist)
}

// Wird geprüft, wenn es den Benutzer nicht gibt: gleiche Rechenzeit, damit die Antwortzeit nichts verrät.
export const ATTRAPPE = 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$' + Buffer.alloc(64).toString('base64')

export function pruefePasswortRegel(passwort) {
  if (typeof passwort !== 'string' || passwort.length < 12) return 'Das Passwort braucht mindestens 12 Zeichen.'
  return null
}
