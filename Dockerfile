FROM node:22-alpine AS build
WORKDIR /repo
COPY web/package*.json web/
RUN cd web && npm ci
COPY web web
COPY supabase supabase
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_STUDENT_EMAIL_DOMAIN
RUN cd web && npm run build

FROM nginx:alpine
# SPA fallback: unknown paths serve index.html
RUN printf 'server {\n listen 80;\n root /usr/share/nginx/html;\n location / { try_files $uri /index.html; }\n}\n' > /etc/nginx/conf.d/default.conf
COPY --from=build /repo/web/dist /usr/share/nginx/html
