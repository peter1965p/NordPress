// Benachrichtigung über neue Formular-Einsendungen.
// Ist im Admin ein Resend-API-Key hinterlegt, geht die Mail über Resend, sonst über Amazon SES (wenn MAIL_FROM gesetzt ist).
// Der Key liegt im Bucket (lokal: im Geheim-Ordner), nie in der Datenbank und nie in einer Antwort der API.
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'

const RESEND_DATEI = 'resend.json'
export const RESEND_KEY = /^re_[A-Za-z0-9_-]{8,200}$/

export function erstelleMailer(k, { ses = null, speicher, db, abrufen = fetch }) {
  let sesClient = ses
  let key   // undefined: noch nicht gelesen

  async function resendKey() {
    if (key === undefined) {
      const text = await speicher.geheimLesen(RESEND_DATEI)
      key = text ? JSON.parse(text).key || '' : ''
    }
    return key
  }
  // Fehler beim Lesen (z. B. fehlende Rechte am Bucket) nicht zwischenspeichern, nur melden
  async function keySicher(log) {
    try { return await resendKey() } catch (e) { log?.error({ err: e }, 'Resend-Key im Bucket nicht lesbar'); return '' }
  }
  async function absender() {
    const { rows } = await db.query("SELECT value FROM settings WHERE key = 'mail_von'")
    return rows[0]?.value || k.mailVon
  }

  return {
    // 'resend', 'ses' oder null (keine Mails)
    async art(log) {
      if (await keySicher(log)) return (await absender()) ? 'resend' : null
      return k.mailVon ? 'ses' : null
    },
    async resendInfo(log) {
      const kk = await keySicher(log)
      return kk ? { gesetzt: true, ende: kk.slice(-4) } : { gesetzt: false }
    },
    async resendSetzen(neu) {
      if (neu) await speicher.geheimAblegen(RESEND_DATEI, JSON.stringify({ key: neu, gespeichert: new Date().toISOString() }))
      else await speicher.geheimLoeschen(RESEND_DATEI)
      key = neu || ''
    },
    async senden({ an, antwortAn, betreff, text }, log) {
      const art = await this.art(log)
      if (art === 'resend') {
        const r = await abrufen('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${await resendKey()}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: await absender(), to: an, subject: betreff, text, ...(antwortAn ? { reply_to: antwortAn } : {}) }),
          signal: AbortSignal.timeout(10000),
        })
        if (!r.ok) {
          let grund = ''
          try { grund = (await r.json()).message || '' } catch {}
          throw new Error(`Resend ${r.status}${grund ? `: ${grund}` : ''}`)
        }
        return art
      }
      if (art === 'ses') {
        sesClient ||= new SESv2Client({ region: k.mailRegion })
        await sesClient.send(new SendEmailCommand({
          FromEmailAddress: await absender(),
          Destination: { ToAddresses: an },
          ...(antwortAn ? { ReplyToAddresses: [antwortAn] } : {}),
          Content: { Simple: { Subject: { Data: betreff, Charset: 'UTF-8' }, Body: { Text: { Data: text, Charset: 'UTF-8' } } } },
        }))
        return art
      }
      throw new Error('Kein Mailversand eingerichtet')
    },
  }
}

const EMAIL = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/
export const empfaengerListe = text => String(text || '').split(',').map(s => s.trim()).filter(Boolean)
// Absender: „adresse“ oder „Name <adresse>“
export const absenderGueltig = text => text === '' || EMAIL.test(text) || /^[^<>\r\n"]{1,80} <[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+>$/.test(text)
export const empfaengerGueltig = text => empfaengerListe(text).length <= 5 && empfaengerListe(text).every(a => EMAIL.test(a))

const einzeilig = s => String(s).replace(/[\r\n]+/g, ' ').slice(0, 150)

// Text der Mail: alle Felder untereinander, Antworten gehen an die E-Mail aus dem Formular
export function einsendungsMail(formular, daten, seite) {
  const zeilen = daten.map(d => {
    const label = d.label.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    const wert = typeof d.wert === 'boolean' ? (d.wert ? 'Ja' : 'Nein') : d.wert || '–'
    return d.typ === 'textarea' ? `${label}:\n${wert}\n` : `${label}: ${wert}`
  })
  const link = seite ? `\n\nIm Admin ansehen: ${seite.replace(/\/$/, '')}/admin/formulare/${formular.id}` : ''
  const absender = daten.find(d => d.typ === 'email' && d.wert)?.wert
  return {
    an: empfaengerListe(formular.benachrichtigung),
    antwortAn: absender,
    betreff: einzeilig(`Neue Einsendung: ${formular.name}`),
    text: `Neue Einsendung über das Formular „${formular.name}“:\n\n${zeilen.join('\n')}${link}\n`,
  }
}
