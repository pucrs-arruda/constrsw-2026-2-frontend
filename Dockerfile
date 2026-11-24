# Stage 1: Build
FROM node:24-alpine AS build

WORKDIR /app

ARG VITE_OAUTH_BASE_URL=/api/auth
ARG VITE_BFF_BASE_URL=/api/bff

COPY package*.json ./
RUN npm ci

COPY . .

# Generate public/config.json from build ARGs
RUN printf '{\n  "oauthBaseUrl": "%s",\n  "bffBaseUrl": "%s"\n}\n' \
    "$VITE_OAUTH_BASE_URL" "$VITE_BFF_BASE_URL" > public/config.json

RUN npx ng build --configuration production

# Stage 2: Runtime
FROM nginx:alpine

RUN apk add --no-cache curl

COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=10s \
  CMD curl -f http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
