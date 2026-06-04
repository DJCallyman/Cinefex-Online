# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=20-bookworm

FROM node:${NODE_VERSION} AS builder
RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev --no-audit --no-fund
COPY . .
# Strip the dev-only public/covers and public/issues symlinks. They
# point at ../covers and ../issues, which exist on the developer's
# Mac but not in the CI build context. Vite's publicDir copy follows
# symlinks and would fail. Replace with empty placeholders so Vite
# copies empty dirs into dist/; the entrypoint will symlink the real
# content (baked covers + bind-mounted issues) over them at startup.
RUN rm -f /app/public/covers /app/public/issues \
    && mkdir -p /app/public/covers /app/public/issues
RUN npx tsc -b && npx vite build

FROM nginx:1.27-alpine AS runtime
# python3 is needed for the entrypoint's create_json.py regen + healthcheck.
RUN apk add --no-cache python3
WORKDIR /app
# dist is the Vite build output. Its issues/ subdir is an empty placeholder
# that the entrypoint will `rm -rf` and symlink to the bind-mounted issues
# share. covers/ is overwritten in the next COPY with the baked tree.
COPY --from=builder /app/dist            /usr/share/nginx/html
COPY --from=builder /app/covers          /usr/share/nginx/html/covers
COPY create_json.py                      /app/create_json.py
# The official nginx:alpine base image auto-runs every script in
# /docker-entrypoint.d/ before its own CMD fires, so this chains our
# setup onto nginx's startup with no extra plumbing.
COPY docker/entrypoint.sh                /docker-entrypoint.d/40-cinefex.sh
COPY docker/nginx.conf                   /etc/nginx/conf.d/default.conf
RUN chmod +x /docker-entrypoint.d/40-cinefex.sh
ENV ISSUES_DIR=/issues
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python3 -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost/issues_full.json',timeout=3).status==200 else 1)"
CMD ["nginx", "-g", "daemon off;"]
