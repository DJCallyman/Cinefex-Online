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

FROM node:${NODE_VERSION}-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/dist            /app/dist
COPY --from=builder /app/fonts           /app/fonts
COPY --from=builder /app/public          /app/public
COPY --from=builder /app/covers          /app/covers
COPY create_json.py                      /app/create_json.py
COPY docker/entrypoint.sh                /app/docker/entrypoint.sh
RUN chmod +x /app/docker/entrypoint.sh
COPY --from=builder /app/node_modules    /app/node_modules
ENV ISSUES_DIR=/issues
ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python3 -c "import urllib.request,sys,os; sys.exit(0 if urllib.request.urlopen('http://localhost:'+os.environ.get('PORT','8080')+'/issues_full.json',timeout=3).status==200 else 1)"
ENTRYPOINT ["/app/docker/entrypoint.sh"]
