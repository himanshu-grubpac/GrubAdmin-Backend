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

RUN bun install

# Copy source code
COPY . .
COPY run.sh .
RUN chmod +x run.sh

EXPOSE ${PORT}

CMD ["./run.sh"]
