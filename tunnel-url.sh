#!/bin/bash
# Get the Cloudflare Tunnel URL
# Usage: bash tunnel-url.sh

set -euo pipefail

echo "Waiting for Cloudflare Tunnel to establish..."
sleep 5

# Check cloudflared logs for the tunnel URL
URL=$(docker logs grub-cloudflared 2>&1 | grep -oP 'https?://[a-zA-Z0-9.-]+\.trycloudflare\.com' | head -1)

if [ -n "$URL" ]; then
    echo ""
    echo "=================================================="
    echo "  Cloudflare Tunnel URL: $URL"
    echo "  API Health:            $URL/api/v1/common/health"
    echo "=================================================="
    echo ""
    echo "Run frontend with:"
    echo "  NEXT_PUBLIC_API_BASE_URL=$URL/api/v1 npm run dev"
    echo ""
else
    echo "Tunnel URL not found yet. Checking logs..."
    docker logs grub-cloudflared --tail=20 2>&1
    echo ""
    echo "If the tunnel is not ready, wait a few seconds and run again:"
    echo "  bash tunnel-url.sh"
fi
