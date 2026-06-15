#!/bin/sh
set -e

echo "🚀 Running database schema push..."
bun db:push

echo "📦 Generating Prisma Client..."
bun db:generate

echo "🔥 Starting GrubAdmin-Backend application..."
exec bun start
