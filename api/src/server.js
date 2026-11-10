import { ladeKonfiguration } from './config.js'
import { baueApp, migriere } from './app.js'

const konfig = ladeKonfiguration()
const app = await baueApp(konfig)

const neu = await migriere(app.db)
if (neu.length) app.log.info({ migrationen: neu }, 'Datenbank aktualisiert')

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    app.log.info(`${signal} erhalten, fahre herunter`)
    await app.close()
    process.exit(0)
  })
}

await app.listen({ host: konfig.host, port: konfig.port })
