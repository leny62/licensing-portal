FROM node:20-alpine AS build

WORKDIR /app

RUN apk add --no-cache make g++ python3 openssl

COPY package*.json ./
RUN npm ci

COPY nest-cli.json tsconfig*.json ./
COPY prisma ./prisma
COPY src ./src

RUN npm run db:generate
RUN npm run build

FROM build AS prod-deps

RUN npm prune --omit=dev
RUN npm cache clean --force

FROM node:20-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

RUN apk add --no-cache dumb-init openssl
RUN addgroup -S licensing && adduser -S licensing -G licensing

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package*.json ./

RUN mkdir -p /data/documents /data/snapshots
RUN chown -R licensing:licensing /app /data

USER licensing

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/v1/readyz >/dev/null || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
