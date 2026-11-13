#!/usr/bin/env bash
# Vom eigenen Rechner aus: testet, baut und spielt NordPress auf den Server.
#   deploy/deploy.sh admin@<IP> [~/.ssh/schluessel.pem]
# Ist ~/.config/nordpress/deploy.env da, wird vorher die SSH-Regel auf die eigene IP gestellt (deploy/ssh-freigabe.sh).
# Alle Abhängigkeiten der API sind reines JavaScript, node_modules läuft deshalb auch auf Arm (Graviton) unverändert.
set -euo pipefail

ZIEL=${1:?Aufruf: deploy/deploy.sh admin@<IP> [schluessel.pem]}
SCHLUESSEL=${2:-$HOME/.ssh/id_ed25519}
SSH="ssh -i $SCHLUESSEL -o StrictHostKeyChecking=accept-new"
WURZEL=$(cd "$(dirname "$0")/.." && pwd)

if [ -f "${NP_KONFIG:-$HOME/.config/nordpress/deploy.env}" ]; then
  "$WURZEL/deploy/ssh-freigabe.sh"
fi

echo ">> Tests"
(cd "$WURZEL/api" && npm test --silent)

echo ">> Frontend bauen"
(cd "$WURZEL/web" && npx vite build --logLevel warn)

echo ">> Abhängigkeiten ohne Entwicklungspakete"
STUFE=$(mktemp -d)
chmod 755 "$STUFE"   # mktemp legt 700 an, rsync -a würde das auf /opt/nordpress/api übertragen
trap 'rm -rf "$STUFE"' EXIT
cp -r "$WURZEL/api/src" "$WURZEL/api/migrations" "$WURZEL/api/scripts" "$WURZEL/api/package.json" "$WURZEL/api/package-lock.json" "$STUFE/"
(cd "$STUFE" && npm ci --omit=dev --silent --no-audit --no-fund)

echo ">> Übertragen"
$SSH "$ZIEL" 'command -v rsync >/dev/null || sudo apt-get install -y -qq rsync; sudo install -d -o admin -g admin /opt/nordpress/api /opt/nordpress/web /opt/nordpress/deploy'
rsync -az --delete -e "$SSH" "$STUFE/" "$ZIEL:/opt/nordpress/api/"
rsync -az --delete -e "$SSH" "$WURZEL/web/dist/" "$ZIEL:/opt/nordpress/web/"
rsync -az --delete -e "$SSH" "$WURZEL/deploy/" "$ZIEL:/opt/nordpress/deploy/"

echo ">> Neustart"
$SSH "$ZIEL" 'if systemctl is-enabled --quiet nordpress 2>/dev/null; then sudo systemctl restart nordpress && sleep 2 && curl -fsS http://127.0.0.1:3001/health && echo; else echo "Erst einmalig: sudo bash /opt/nordpress/deploy/server-einrichten.sh"; fi'

echo ">> nginx"
# Nach dem Neustart, damit die neuen Pfade schon eine passende API vorfinden.
# Gemeinsamer Teil der nginx-Konfiguration. Ist er fehlerhaft, bleibt der alte.
$SSH "$ZIEL" 'N=/etc/nginx/snippets/nordpress.conf; [ -f $N ] || exit 0
  cmp -s /opt/nordpress/deploy/nginx-inhalt.conf $N && exit 0
  sudo cp $N $N.vorher && sudo install -m 644 /opt/nordpress/deploy/nginx-inhalt.conf $N
  if sudo nginx -t -q; then sudo systemctl reload nginx && echo "nginx neu geladen"
  else sudo cp $N.vorher $N; echo "nginx-Konfiguration fehlerhaft, die alte bleibt aktiv" >&2; exit 1; fi'
