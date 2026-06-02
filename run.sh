#!/bin/sh
set -e

echo "Generating Prisma Client..."
bun db:generate || { echo "Prisma generate failed, continuing..."; }

echo "Starting GrubAdmin-Backend application..."
exec bun start
