# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Production stage ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

# Copy generated Prisma client + compiled output
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/dist      ./dist
COPY --from=builder /app/prisma    ./prisma

EXPOSE 4053

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:4053/health || exit 1

CMD ["node", "dist/main.js"]
