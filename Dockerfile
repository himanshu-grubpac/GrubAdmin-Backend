FROM oven/bun:debian

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8000

# System deps + Node.js 24
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    gnupg \
    build-essential \
    python3 \
    openssl \
    && curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y nodejs \
    && node -v \
    && bun -v \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_BINARY=/usr/bin/node

# Copy dependency + prisma files first
COPY package.json bun.lockb* ./

RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma Client (output directory is src/db/prisma)
RUN bun prisma generate

RUN groupadd --system appuser && useradd --system --gid appuser appuser \
    && chown -R appuser:appuser /app

USER appuser

EXPOSE ${PORT}

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:${PORT}/api/v1/common/health || exit 1

CMD ["bun", "src/index.ts"]
