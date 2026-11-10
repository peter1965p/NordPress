#!/usr/bin/env bash
# Vom eigenen Rechner aus: testet, baut und spielt NordPress auf den Server.
#   deploy/deploy.sh admin@<IP> [~/.ssh/schluessel.pem]
# Alle Abhängigkeiten der API sind reines JavaScript, node_modules läuft deshalb auch auf Arm (Graviton) unverändert.
set -euo pipefail

ZIEL=${1:?Aufruf: deploy/deploy.sh admin@<IP> [schluessel.pem]}
SCHLUESSEL=${2:-$HOME/.ssh/id_ed25519}
SSH="ssh -i $SCHLUESSEL -o StrictHostKeyChecking=accept-new"
WURZEL=$(cd "$(dirname "$0")/.." && pwd)

echo ">> Tests"
(cd "$WURZEL/api" && npm test --silent)

echo ">> Frontend bauen"
(cd "$WURZEL/web" && npx vite build --logLevel warn)

echo ">> Abhängigkeiten ohne Entwicklungspakete"
STUFE=$(mktemp -d)
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
