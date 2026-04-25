# Build stage: install deps and produce dist/
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Vite inlines VITE_* values at build time, so they must be present here
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

RUN npm run build

# Serve stage: nginx serves dist/ on $PORT (Cloud Run injects PORT, defaults to 8080)
FROM nginx:alpine
ENV PORT=8080
ENV NGINX_ENVSUBST_VARS=PORT
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 8080
