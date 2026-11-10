import crypto from 'node:crypto'

export const COOKIE = 'np_sid'
const RANG = { author: 1, editor: 2, admin: 3 }

const sha256 = t => crypto.createHash('sha256').update(t).digest('hex')

export async function starteSitzung(app, antwort, benutzerId) {
  const token = crypto.randomBytes(32).toString('base64url')
  const tage = app.konfig.sitzungTage
  await app.db.query(
    "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + make_interval(days => $3))",
    [sha256(token), benutzerId, tage],
  )
  antwort.setCookie(COOKIE, token, {
    path: '/', httpOnly: true, sameSite: 'strict', secure: app.konfig.cookieSicher, maxAge: tage * 86400,
  })
}

export async function beendeSitzung(app, anfrage, antwort) {
  const token = anfrage.cookies[COOKIE]
  if (token) await app.db.query('DELETE FROM sessions WHERE token_hash = $1', [sha256(token)])
  antwort.clearCookie(COOKIE, { path: '/' })
}

// Hängt den angemeldeten Benutzer an die Anfrage (oder null).
export async function ladeBenutzer(app, anfrage) {
  const token = anfrage.cookies[COOKIE]
  if (!token) return null
  const { rows } = await app.db.query(
    `SELECT u.id, u.email, u.name, u.role FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`, [sha256(token)])
  return rows[0] || null
}

// preHandler: verlangt Anmeldung und mindestens die angegebene Rolle.
export function braucht(rolle = 'author') {
  return async (anfrage, antwort) => {
    if (!anfrage.benutzer) return antwort.code(401).send({ fehler: 'Nicht angemeldet' })
    if (RANG[anfrage.benutzer.role] < RANG[rolle]) return antwort.code(403).send({ fehler: 'Keine Berechtigung' })
  }
}

export const istMindestens = (benutzer, rolle) => RANG[benutzer.role] >= RANG[rolle]
