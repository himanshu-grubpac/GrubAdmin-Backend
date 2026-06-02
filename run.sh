#!/bin/sh
set -e

echo "🚀 Running database schema push..."
bun db:push || { echo "Database push failed, continuing..."; }

echo "📦 Generating Prisma Client..."
bun db:generate || { echo "Prisma generate failed, continuing..."; }

echo "🔥 Starting GrubAdmin-Backend application..."
exec bun start
