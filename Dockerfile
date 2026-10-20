# Build stage: install deps and produce dist/
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Vite inlines VITE_* values at build time, so they must be present here
# (Firebase web config values are public identifiers; access is enforced by firestore.rules)
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_DATABASE_ID=
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY     VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN     VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID     VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID     VITE_FIREBASE_DATABASE_ID=$VITE_FIREBASE_DATABASE_ID

RUN npm run build

# Serve stage: nginx serves dist/ on $PORT (Cloud Run injects PORT, defaults to 8080)
FROM nginx:alpine
ENV PORT=8080
ENV NGINX_ENVSUBST_VARS=PORT
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 8080
