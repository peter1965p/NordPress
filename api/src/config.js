// Alle Einstellungen kommen aus Umgebungsvariablen (auf dem Server: /etc/nordpress/env).
const env = process.env

function bool(wert, standard) {
  if (wert === undefined || wert === '') return standard
  return ['1', 'true', 'ja', 'yes'].includes(String(wert).toLowerCase())
}

export function ladeKonfiguration(ueberschreiben = {}) {
  const k = {
    host: env.HOST || '127.0.0.1',
    port: Number(env.PORT || 3001),
    datenbank: env.DATABASE_URL || 'postgres://postgres@localhost/nordpress',
    // off | require (verschlüsselt) | verify (verschlüsselt und Zertifikat gegen DB_SSL_CA prüfen)
    dbSsl: env.DB_SSL || 'off',
    dbSslCa: env.DB_SSL_CA || '',
    cookieSicher: bool(env.COOKIE_SECURE, true),
    sitzungTage: Number(env.SESSION_DAYS || 7),
    // local | s3
    speicher: env.STORAGE || 'local',
    uploadOrdner: env.UPLOAD_DIR || './uploads',
    s3Bucket: env.S3_BUCKET || '',
    s3Region: env.S3_REGION || env.AWS_REGION || 'eu-west-1',
    s3Praefix: env.S3_PREFIX || 'media/',
    maxUploadMb: Number(env.MAX_UPLOAD_MB || 5),
    // Einsendungen je IP in 10 Minuten
    formularLimit: Number(env.FORM_LIMIT || 5),
    logger: bool(env.LOG, true),
    ...ueberschreiben,
  }
  if (k.speicher === 's3' && !k.s3Bucket) throw new Error('STORAGE=s3 braucht S3_BUCKET')
  return k
}
