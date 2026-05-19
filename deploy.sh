#!/bin/bash
set -euo pipefail

echo "=== GrubPac Backend Production Deployment ==="

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"
PROJECT_NAME="grubpac"

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "Docker is required but not installed."; exit 1; }
command -v docker compose >/dev/null 2>&1 || { echo "Docker Compose is required but not installed."; exit 1; }

# Check env file
if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: $ENV_FILE not found. Copy .env.production.example and fill in values."
    echo "  cp .env.production.example $ENV_FILE"
    exit 1
fi

# Pull latest images
echo "Pulling latest images..."
docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" pull

# Build and start services
echo "Building and starting services..."
docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" up --build -d

# Wait for health check
echo "Waiting for API to be healthy..."
for i in {1..30}; do
    if curl -sf http://localhost:8000/api/v1/common/health > /dev/null 2>&1; then
        echo "API is healthy!"
        break
    fi
    echo "Attempt $i/30: API not ready yet..."
    sleep 3
done

# Verify Nginx
echo "Verifying Nginx proxy..."
if curl -sf http://localhost/api/v1/common/health > /dev/null 2>&1; then
    echo "Nginx proxy is working!"
else
    echo "WARNING: Nginx proxy check failed. Check nginx logs."
    docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" logs nginx --tail=20
fi

echo ""
echo "Getting Cloudflare Tunnel URL..."
bash tunnel-url.sh

echo ""
echo "=== Deployment complete ==="
echo ""
echo "Services:"
docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" ps

echo ""
echo "To view logs:"
echo "  docker compose -p $PROJECT_NAME -f $COMPOSE_FILE logs -f api"
echo "  docker compose -p $PROJECT_NAME -f $COMPOSE_FILE logs -f nginx"
echo "  docker compose -p $PROJECT_NAME -f $COMPOSE_FILE logs -f cloudflared"
echo ""
echo "To stop:"
echo "  docker compose -p $PROJECT_NAME -f $COMPOSE_FILE down"
