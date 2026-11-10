# NordPress

Headless-CMS nach dem Vorbild von WordPress: Beiträge, Seiten, Kategorien, Schlagwörter, Mediathek, Rollen und eine öffentliche REST-API. Gebaut für den Betrieb auf AWS mit EC2, RDS PostgreSQL und S3.

| Teil | Technik |
|---|---|
| API | Node.js, Fastify 5, PostgreSQL (`pg`), JSON-Schema-Validierung |
| Admin und Beispiel-Frontend | Vue 3, Vue Router, Tailwind CSS 4, Vite |
| Medien | lokal oder S3 (privater Bucket, Auslieferung per signiertem Link) |
| Betrieb | nginx (TLS, Reverse Proxy, CSP), systemd mit Härtung |

## Funktionen

- **Beiträge und Seiten** in Markdown, Entwurf oder online, Beitragsbild, Auszug, Menü-Reihenfolge für Seiten
- **Kategorien und Schlagwörter** mit eigenem Slug
- **Mediathek**: JPEG, PNG, GIF, WebP bis 5 MB, Typ wird an den ersten Bytes erkannt, Alternativtext
- **Rollen** wie bei WordPress: Autor (eigene Beiträge), Redakteur (alle Inhalte), Administrator (zusätzlich Benutzer und Einstellungen)
- **Öffentliche REST-API** unter `/api/v1`, liefert nur Veröffentlichtes, CORS offen für fremde Frontends

## Sicherheit

- Passwörter mit scrypt, mindestens 12 Zeichen. Bei unbekannter Adresse wird trotzdem gerechnet, damit die Antwortzeit nichts verrät.
- Sitzung im HttpOnly-Cookie mit `SameSite=Strict`, in der Datenbank steht nur der SHA-256 des Tokens. Ein neues Passwort beendet alle Sitzungen.
- CSRF-Schutz: Jede ändernde Anfrage braucht den Header `X-Nordpress: 1`.
- Login-Drossel: 10 Versuche in 15 Minuten.
- Markdown wird beim Speichern gerendert und mit `sanitize-html` bereinigt. Kein `<script>`, keine Event-Handler, kein `javascript:`.
- Unbekannte Felder im Request werden abgelehnt, nicht still entfernt.
- nginx setzt CSP, HSTS, `nosniff` und `X-Frame-Options`. Die API lauscht nur auf `127.0.0.1`.

## Entwickeln

```bash
cd api && npm install && npm test     # 21 Tests gegen eine temporäre PostgreSQL (initdb, nur Unix-Socket)
cd web && npm install && npm run dev  # Vite leitet /api, /admin/api und /uploads an :3001 weiter
```

Die API liest ihre Einstellungen aus Umgebungsvariablen, siehe `deploy/env.beispiel`. Lokal reicht eine `api/.env` mit `DATABASE_URL`, `COOKIE_SECURE=false` und `STORAGE=local`, dann `npm run dev`.

Erster Administrator: `node scripts/admin-anlegen.js <email> "<Name>"`. Das Passwort wird abgefragt.

## REST-API

| Aufruf | Inhalt |
|---|---|
| `GET /api/v1/posts?page=&per_page=&category=&tag=&search=` | veröffentlichte Beiträge mit Gesamtzahl |
| `GET /api/v1/posts/:slug` | ein Beitrag mit `content_html`, Kategorien, Schlagwörtern, Beitragsbild |
| `GET /api/v1/pages` · `/pages/:slug` | Seiten fürs Menü, einzelne Seite |
| `GET /api/v1/categories` · `/tags` | mit Anzahl veröffentlichter Beiträge |
| `GET /api/v1/settings` | Titel und Untertitel |

## Betrieb auf AWS

Region `eu-west-1`. Alles mit dem Tag `uebung=cwa`, dann findet der Tag-Editor beim Aufräumen alles.

1. **S3-Bucket** anlegen: Block Public Access komplett an, Verschlüsselung SSE-S3. Keine Bucket-Policy nötig.
2. **IAM-Rolle für EC2** (Vertrauensstellung `ec2.amazonaws.com`) mit genau diesem Recht, keine Schlüssel auf dem Server:
   ```json
   { "Version": "2012-10-17", "Statement": [{ "Effect": "Allow",
     "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
     "Resource": "arn:aws:s3:::<BUCKET>/media/*" }] }
   ```
   Der Instanz zuweisen: EC2 → Instanz → Aktionen → Sicherheit → IAM-Rolle ändern.
3. **RDS PostgreSQL** `db.t4g.micro`, Single-AZ, nicht öffentlich, über „Mit EC2-Rechenressource verbinden“ an die Instanz gebunden, Backup-Aufbewahrung ab 1 Tag (Point-in-Time-Recovery).
4. **Eigener DB-Benutzer** statt des Hauptbenutzers, auf der Instanz:
   ```sql
   CREATE ROLE nordpress LOGIN PASSWORD '<langes Passwort>';
   CREATE DATABASE nordpress OWNER nordpress;
   ```
5. **Ausliefern** vom eigenen Rechner: `deploy/deploy.sh admin@<IP>`. Einmalig danach auf dem Server `sudo bash /opt/nordpress/deploy/server-einrichten.sh`, `/etc/nordpress/env` ausfüllen, `sudo systemctl restart nordpress`, dann den ersten Administrator anlegen:
   ```bash
   cd /opt/nordpress/api && sudo -u nordpress env $(sudo cat /etc/nordpress/env | xargs) node scripts/admin-anlegen.js <email> "<Name>"
   ```
6. In der Security Group **HTTPS (443)** für die eigene IP freigeben. Das Zertifikat ist selbstsigniert, der Browser warnt einmal.

Logs: `journalctl -u nordpress -f`. Die Datenbank migriert sich beim Start selbst.
