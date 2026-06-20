# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=20-bookworm

FROM node:${NODE_VERSION} AS builder
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
# Python is no longer needed in the runtime image: the JSON metadata
# (issues.json, issues_full.json) is committed to git and baked into
# the image at build time, and the entrypoint no longer regenerates
# it. The /issues share is still bind-mounted at runtime because the
# article iframes load their HTML directly from it.
WORKDIR /app
# dist is the Vite build output. Its issues/ subdir is an empty placeholder
# that the entrypoint will `rm -rf` and symlink to the bind-mounted issues
# share. covers/ is overwritten in the next COPY with the baked tree.
COPY --from=builder /app/dist            /usr/share/nginx/html
COPY --from=builder /app/covers          /usr/share/nginx/html/covers
# The official nginx:alpine base image auto-runs every script in
# /docker-entrypoint.d/ before its own CMD fires, so this chains our
# setup onto nginx's startup with no extra plumbing.
COPY docker/entrypoint.sh                /docker-entrypoint.d/40-cinefex.sh
COPY docker/nginx.conf                   /etc/nginx/conf.d/default.conf
RUN chmod +x /docker-entrypoint.d/40-cinefex.sh
ENV ISSUES_DIR=/issues
EXPOSE 80
# Healthcheck verifies the bind-mounted /issues share is actually
# populated and served by nginx — NOT just the baked metadata JSON.
# `issues_full.json` is baked into the image, so checking it would
# report healthy even when the bind mount is empty/missing (the exact
# failure the entrypoint's 30s wait is meant to catch). Issue 1's
# ReadingView HTML is a stable, known-present file in every complete
# archive, so a 200 here proves the mount is live.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO/dev/null http://localhost/issues/1/1.ReadingView.html || exit 1
CMD ["nginx", "-g", "daemon off;"]
