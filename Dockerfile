FROM node:20-alpine as base

###################
# DEPS (all dependencies for build)
###################

FROM base AS deps
WORKDIR /deps

COPY package.json package-lock.json ./
RUN npm install

###################
# PROD DEPS (only production)
###################

FROM base AS production-deps
WORKDIR /deps

COPY package.json package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

###################
# BUILD
###################

FROM base AS build
WORKDIR /build

COPY --from=deps /deps/node_modules ./node_modules
COPY package.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY postcss.config.js ./
COPY tailwind.config.ts ./
COPY components.json ./
COPY server ./server
COPY client ./client
COPY shared ./shared
COPY script ./script
COPY drizzle.config.ts ./

# Build через правильный скрипт (frontend + backend)
RUN npm run build

###################
# MIGRATE (для миграций нужны все зависимости)
###################

FROM base AS migrate
WORKDIR /app

# Все зависимости (включая drizzle-kit)
COPY --from=deps /deps/node_modules ./node_modules

# Конфиги для миграций
COPY --from=build /build/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /build/shared ./shared
COPY package.json ./

ENV NODE_ENV=production

###################
# PRODUCTION
###################

FROM base AS production
WORKDIR /app

RUN apk add --no-cache tini wget && \
    rm -rf /var/cache/apk/* /tmp/*

# Production dependencies (только runtime, без dev)
COPY --from=production-deps /deps/node_modules ./node_modules

# Билды (frontend + backend из npm run build)
COPY --from=build /build/dist ./dist

# Конфиги для миграций
COPY --from=build /build/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /build/shared ./shared
COPY package.json ./

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.cjs"]

