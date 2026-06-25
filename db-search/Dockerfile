FROM node:22-alpine AS base
WORKDIR /app

# ---- deps ----
FROM base AS deps
COPY package*.json ./
RUN npm ci --omit=dev

# ---- app ----
FROM base AS runner
ENV NODE_ENV=production

# Copy deps and source
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY tsconfig.json ./
COPY src ./src
COPY migrations ./migrations
COPY data ./data
COPY public ./public

EXPOSE 3000

# Migrate (idempotent) then start. Safe to run on every container boot.
# CMD ["sh", "-c", "node --import tsx/esm src/migrate.ts && node --import tsx/esm src/server.ts"]
CMD ["npm", "run", "start:deploy"]
