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
# PRODUCTION
###################

FROM base AS production
WORKDIR /app

# tini, wget, postgresql-client, nginx
RUN apk add --no-cache tini wget postgresql-client nginx && \
    mkdir -p /var/log/nginx && \
    rm -rf /var/cache/apk/* /tmp/*

# Production dependencies (только runtime, без dev)
COPY --from=production-deps /deps/node_modules ./node_modules

# Билды (frontend + backend из npm run build)
COPY --from=build /build/dist ./dist

# Конфиги для миграций
COPY --from=build /build/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /build/shared ./shared
COPY package.json ./

# Nginx config
COPY nginx.conf /etc/nginx/nginx.conf

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 80

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "node dist/index.cjs & nginx -g 'daemon off;'"]

