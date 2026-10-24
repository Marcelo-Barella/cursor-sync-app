FROM node:22-alpine AS build

WORKDIR /app

ARG VITE_API_URL=http://localhost:8100
ENV VITE_API_URL=$VITE_API_URL

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/

RUN npm ci -w @cursor-sync/web

COPY apps/web ./apps/web

RUN npm run build -w @cursor-sync/web

FROM nginx:1.27-alpine

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
