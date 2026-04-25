# Build stage: install deps and produce dist/
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Serve stage: nginx serves dist/ on $PORT (Cloud Run injects PORT, defaults to 8080)
FROM nginx:alpine
ENV PORT=8080
ENV NGINX_ENVSUBST_VARS=PORT
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 8080
