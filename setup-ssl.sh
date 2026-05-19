#!/bin/bash
set -euo pipefail

DOMAIN="${1:-grubpac.duckdns.org}"
DUCKDNS_TOKEN="${2:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -z "$DUCKDNS_TOKEN" ]; then
    echo "Usage: $0 [domain] <duckdns-token>"
    echo ""
    echo "Steps:"
    echo "  1. Go to https://duckdns.org"
    echo "  2. Sign in (GitHub/Google/Twitter/Reddit)"
    echo "  3. Create domain 'grubpac' (or your preferred name)"
    echo "  4. Copy the token"
    echo ""
    echo "Example: $0 grubpac.duckdns.org a1b2c3d4-e5f6-...-abcdef"
    exit 1
fi

# Get subdomain name from domain (grubpac.duckdns.org -> grubpac)
SUBDOMAIN="${DOMAIN%%.*}"

# 1. Update DuckDNS with our IP
echo "[1/4] Updating DuckDNS IP..."
curl -s "https://www.duckdns.org/update?domains=$SUBDOMAIN&token=$DUCKDNS_TOKEN&ip="
echo ""

# 2. Install acme.sh
echo "[2/4] Installing acme.sh..."
if [ ! -f "$HOME/.acme.sh/acme.sh" ]; then
    curl -fsSL https://get.acme.sh | sh
fi
export DUCKDNS_TOKEN

# 3. Issue Let's Encrypt cert via DuckDNS DNS API
echo "[3/4] Issuing Let's Encrypt certificate..."
mkdir -p "$SCRIPT_DIR/ssl"

"$HOME/.acme.sh/acme.sh" --issue --dns dns_duckdns -d "$DOMAIN"

# 4. Install cert to nginx ssl directory with auto-renewal hook
echo "[4/4] Installing certificate to ./ssl/..."
"$HOME/.acme.sh/acme.sh" --install-cert -d "$DOMAIN" \
    --fullchain-file "$SCRIPT_DIR/ssl/fullchain.pem" \
    --key-file "$SCRIPT_DIR/ssl/privkey.pem" \
    --reloadcmd "cd $SCRIPT_DIR && docker compose -p grubpac -f docker-compose.prod.yml restart nginx"

echo ""
echo "Done! Certificate installed at $SCRIPT_DIR/ssl/"
echo "Auto-renewal is handled by acme.sh (installed as a cron job)."
echo ""
echo "Next: docker compose -p grubpac -f docker-compose.prod.yml up -d --build"
