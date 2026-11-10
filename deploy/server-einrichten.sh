#!/usr/bin/env bash
# Einmalig auf dem Server (Debian 13) als admin ausführen, nachdem deploy.sh die Dateien nach /opt/nordpress kopiert hat:
#   sudo bash /opt/nordpress/deploy/server-einrichten.sh
# Wiederholbar: legt nur an, was fehlt. Überschreibt /etc/nordpress/env nie.
set -euo pipefail

id nordpress >/dev/null 2>&1 || useradd --system --home /nonexistent --shell /usr/sbin/nologin nordpress

install -d -m 750 -o root -g nordpress /etc/nordpress
if [ ! -f /etc/nordpress/env ]; then
  install -m 640 -o root -g nordpress /opt/nordpress/deploy/env.beispiel /etc/nordpress/env
  echo ">> /etc/nordpress/env angelegt: Platzhalter <...> ausfüllen!"
fi
if [ ! -f /etc/nordpress/rds-global-bundle.pem ]; then
  curl -fsSL https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem -o /etc/nordpress/rds-global-bundle.pem
  chmod 644 /etc/nordpress/rds-global-bundle.pem
fi

# Selbstsigniertes Zertifikat, 1 Jahr, für die öffentliche IP
if [ ! -f /etc/nginx/ssl/nordpress.crt ]; then
  install -d -m 700 /etc/nginx/ssl
  IP=$(curl -fsS -H "X-aws-ec2-metadata-token: $(curl -fsS -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 60')" \
       http://169.254.169.254/latest/meta-data/public-ipv4 || echo 127.0.0.1)
  openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes -days 365 \
    -subj "/CN=$IP" -addext "subjectAltName=IP:$IP" \
    -keyout /etc/nginx/ssl/nordpress.key -out /etc/nginx/ssl/nordpress.crt
  chmod 600 /etc/nginx/ssl/nordpress.key
fi

install -m 644 /opt/nordpress/deploy/nginx.conf /etc/nginx/sites-available/nordpress
ln -sf /etc/nginx/sites-available/nordpress /etc/nginx/sites-enabled/nordpress
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

install -m 644 /opt/nordpress/deploy/nordpress.service /etc/systemd/system/nordpress.service
systemctl daemon-reload
systemctl enable nordpress
echo ">> Fertig. Nach dem Ausfüllen von /etc/nordpress/env: sudo systemctl restart nordpress"
