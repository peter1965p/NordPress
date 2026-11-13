// Benachrichtigung über neue Formular-Einsendungen per Amazon SES (API v2).
// Zugangsdaten kommen wie bei S3 über die IAM-Rolle der Instanz. Ohne MAIL_FROM wird nichts gesendet.
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'

export function erstelleMailer(k, client = null) {
  if (!k.mailVon) return { aktiv: false, async senden() {} }
  const ses = client || new SESv2Client({ region: k.mailRegion })
  return {
    aktiv: true,
    async senden({ an, antwortAn, betreff, text }) {
      await ses.send(new SendEmailCommand({
        FromEmailAddress: k.mailVon,
        Destination: { ToAddresses: an },
        ...(antwortAn ? { ReplyToAddresses: [antwortAn] } : {}),
        Content: { Simple: { Subject: { Data: betreff, Charset: 'UTF-8' }, Body: { Text: { Data: text, Charset: 'UTF-8' } } } },
      }))
    },
  }
}

const EMAIL = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/
export const empfaengerListe = text => String(text || '').split(',').map(s => s.trim()).filter(Boolean)
export const empfaengerGueltig = text => empfaengerListe(text).length <= 5 && empfaengerListe(text).every(a => EMAIL.test(a))

const einzeilig = s => String(s).replace(/[\r\n]+/g, ' ').slice(0, 150)

// Text der Mail: alle Felder untereinander, Antworten gehen an die E-Mail aus dem Formular
export function einsendungsMail(formular, daten, seite) {
  const zeilen = daten.map(d => {
    const label = d.label.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    const wert = d.typ === 'checkbox' ? (d.wert ? 'Ja' : 'Nein') : d.wert || '–'
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
