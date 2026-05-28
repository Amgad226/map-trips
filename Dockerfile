# syntax=docker/dockerfile:1

# ------------------ Base ------------------
FROM node:22-slim AS base

# Install ffmpeg (video processing) + ca-certificates
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ------------------ Dependencies ------------------
FROM base AS deps
COPY package.json ./
RUN npm install

# ------------------ Builder ------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV DATABASE_URL=file:/app/dev.db

# Generate Prisma client
RUN npx prisma generate

# Build Next.js
RUN npm run build

# ------------------ Production ------------------
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

# Create non-root user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

# Create temp uploads dir
RUN mkdir -p /app/uploads/tmp && chown -R nextjs:nodejs /app/uploads

# Copy built artifacts and runtime files only
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/next.config.ts ./next.config.ts

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
