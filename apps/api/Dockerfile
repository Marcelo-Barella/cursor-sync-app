FROM node:22-alpine AS build

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

RUN npm ci

COPY apps/api ./apps/api
COPY apps/web ./apps/web

RUN npm run build -w @cursor-sync/api

FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8100

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist

EXPOSE 8100

CMD ["node", "apps/api/dist/index.js"]
