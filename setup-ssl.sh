#!/bin/bash
set -euo pipefail

DOMAIN="${1:-grubpac.dynu.net}"
Dynu_ClientId="${2:-}"
Dynu_Secret="${3:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -z "$Dynu_ClientId" ] || [ -z "$Dynu_Secret" ]; then
    echo "Usage: $0 [domain] <dynu-client-id> <dynu-secret>"
    echo ""
    echo "Steps:"
    echo "  1. Go to https://www.dynu.com and create a free account"
    echo "  2. Create a DDNS hostname (Control Panel -> DDNS/DNS Services -> Add)"
    echo "  3. Set the A record to your EC2 IP: 43.204.34.10"
    echo "  4. Generate API credentials (Account -> API Credentials -> Create)"
    echo ""
    echo "Example: $0 grubpac.dynu.net abc123... xyz789..."
    exit 1
fi

echo "[1/3] Installing acme.sh..."
if [ ! -f "$HOME/.acme.sh/acme.sh" ]; then
    curl -fsSL https://get.acme.sh | sh
fi

export Dynu_ClientId
export Dynu_Secret

echo "[2/3] Issuing Let's Encrypt certificate for $DOMAIN..."
mkdir -p "$SCRIPT_DIR/ssl"

"$HOME/.acme.sh/acme.sh" --issue --dns dns_dynu -d "$DOMAIN"

echo "[3/3] Installing certificate to ./ssl/..."
"$HOME/.acme.sh/acme.sh" --install-cert -d "$DOMAIN" \
    --fullchain-file "$SCRIPT_DIR/ssl/fullchain.pem" \
    --key-file "$SCRIPT_DIR/ssl/privkey.pem" \
    --reloadcmd "cd $SCRIPT_DIR && docker compose -p grubpac -f docker-compose.prod.yml restart nginx"

echo ""
echo "Done! Certificate installed at $SCRIPT_DIR/ssl/"
echo "Auto-renewal handled by acme.sh (cron)."
echo ""
echo "Next: docker compose -p grubpac -f docker-compose.prod.yml up -d --build"
