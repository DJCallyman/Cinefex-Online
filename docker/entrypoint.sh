#!/usr/bin/env bash
# Runs inside the runtime container. Regenerates JSON metadata against
# the bind-mounted ISSUES_DIR if available, otherwise serves the index
# baked into the image at build time. Then starts vite preview.
set -euo pipefail

ISSUES_DIR="${ISSUES_DIR:-/issues}"
PORT="${PORT:-8080}"

echo "[entrypoint] ISSUES_DIR=$ISSUES_DIR PORT=$PORT"

# Wait up to 30s for the bind mount. unraid sometimes has a race where
# the share isn't quite ready when the container starts.
REGEN=0
for i in $(seq 1 30); do
    if [[ -d "$ISSUES_DIR" && -n "$(ls -A "$ISSUES_DIR" 2>/dev/null)" ]]; then
        REGEN=1
        break
    fi
    echo "[entrypoint] Waiting for $ISSUES_DIR to be mounted... ($i/30)"
    sleep 1
done

if [[ $REGEN -eq 1 ]]; then
    echo "[entrypoint] Regenerating JSON metadata against $ISSUES_DIR ..."
    ISSUES_BASE_DIR="$ISSUES_DIR" python3 /app/create_json.py
    cp /app/public/issues_full.json      /app/dist/issues_full.json
    cp /app/public/issues.json           /app/dist/issues.json
    cp /app/public/search_index.json     /app/dist/search_index.json
    cp /app/public/search_index.json.gz  /app/dist/search_index.json.gz 2>/dev/null || true
else
    echo "[entrypoint] WARN: $ISSUES_DIR unavailable; serving baked index."
    echo "[entrypoint] Bind-mount your issues share, e.g.:"
    echo "[entrypoint]   -v /mnt/user/appdata/cinefex/issues:$ISSUES_DIR"
fi

echo "[entrypoint] Starting vite preview on 0.0.0.0:$PORT"
exec npx vite preview --host 0.0.0.0 --port "$PORT"
