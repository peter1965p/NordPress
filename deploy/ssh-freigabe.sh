#!/usr/bin/env bash
# Stellt die SSH-Regel (TCP 22) der Security Group auf die aktuelle öffentliche IP dieses Rechners um.
# Wird von deploy.sh aufgerufen, geht aber auch allein: deploy/ssh-freigabe.sh
#
# Einstellungen in ~/.config/nordpress/deploy.env (liegt bewusst außerhalb des Repos):
#   NP_SG_ID=sg-...              Security Group der Instanz
#   NP_AWS_PROFILE=nordpress-deploy
#   NP_AWS_REGION=eu-west-1
# Rechte des Profils: deploy/iam-ssh-freigabe.json
#
# Andere SSH-Regeln (alte IPs) in dieser Gruppe werden entfernt. HTTP/HTTPS bleiben unberührt.
set -euo pipefail

KONFIG=${NP_KONFIG:-$HOME/.config/nordpress/deploy.env}
[ -f "$KONFIG" ] && . "$KONFIG"
: "${NP_SG_ID:?NP_SG_ID fehlt (in $KONFIG eintragen)}"
AWS="aws --profile ${NP_AWS_PROFILE:-nordpress-deploy} --region ${NP_AWS_REGION:-eu-west-1} --output text"

IP=$(curl -fsS --max-time 10 https://checkip.amazonaws.com | tr -d '[:space:]')
[[ $IP =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "Eigene IP nicht ermittelbar: '$IP'" >&2; exit 1; }
CIDR="$IP/32"

# Alle eingehenden IPv4-Regeln für TCP 22: Regel-ID und Quelle
REGELN=$($AWS ec2 describe-security-group-rules --filters "Name=group-id,Values=$NP_SG_ID" \
  --query "SecurityGroupRules[?!IsEgress && IpProtocol=='tcp' && FromPort==\`22\` && ToPort==\`22\` && CidrIpv4!=null].[SecurityGroupRuleId,CidrIpv4]")

if grep -qw "$CIDR" <<<"$REGELN"; then
  echo ">> SSH-Freigabe: $CIDR ist schon eingetragen"
else
  $AWS ec2 authorize-security-group-ingress --group-id "$NP_SG_ID" \
    --ip-permissions "IpProtocol=tcp,FromPort=22,ToPort=22,IpRanges=[{CidrIp=$CIDR,Description=nordpress-deploy}]" >/dev/null
  echo ">> SSH-Freigabe: $CIDR eingetragen"
fi

# Alte Freigaben entfernen
ALT=$(awk -v neu="$CIDR" '$2 != neu { print $1 }' <<<"$REGELN")
if [ -n "$ALT" ]; then
  # shellcheck disable=SC2086
  $AWS ec2 revoke-security-group-ingress --group-id "$NP_SG_ID" --security-group-rule-ids $ALT >/dev/null
  echo ">> SSH-Freigabe: alte Regeln entfernt ($(awk -v neu="$CIDR" '$2 != neu { printf "%s ", $2 }' <<<"$REGELN"))"
fi
