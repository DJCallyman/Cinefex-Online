#!/bin/sh
# Runs inside the runtime container. Waits for the bind-mounted
# ISSUES_DIR, exposes the baked covers + bind-mounted issues trees
# under nginx's docroot, then exits so the base image's own
# /docker-entrypoint.sh can start nginx.
#
# Note: JSON metadata (issues.json, issues_full.json) is baked into
# the image at build time and committed to git, so we no longer
# regenerate it here. The cinefex run is finite (the magazine is
# cancelled), so the JSON only changes via targeted hand edits.
#
# Uses POSIX /bin/sh (not bash) because the nginx:alpine base image
# only ships BusyBox ash, and the base image's own entrypoint runs
# our script via `ash` regardless of the shebang — but using /bin/sh
# keeps the script portable to other minimal images.
set -eu

ISSUES_DIR="${ISSUES_DIR:-/issues}"
DOCROOT="/usr/share/nginx/html"

echo "[entrypoint] ISSUES_DIR=$ISSUES_DIR DOCROOT=$DOCROOT"

# Wait up to 30s for the bind mount. unraid sometimes has a race where
# the share isn't quite ready when the container starts. The mount is
# required because the article iframes load /issues/<N>/<file>.html
# straight out of this share at request time.
MOUNTED=0
for i in $(seq 1 30); do
    if [ -d "$ISSUES_DIR" ] && [ -n "$(ls -A "$ISSUES_DIR" 2>/dev/null)" ]; then
        MOUNTED=1
        break
    fi
    echo "[entrypoint] Waiting for $ISSUES_DIR to be mounted... ($i/30)"
    sleep 1
done

if [ "$MOUNTED" -eq 0 ]; then
    echo "[entrypoint] FATAL: $ISSUES_DIR is empty or not mounted."
    echo "[entrypoint] Bind-mount your issues share, e.g.:"
    echo "[entrypoint]   -v /mnt/user/appdata/cinefex/issues:$ISSUES_DIR"
    exit 1
fi

# Expose the bind-mounted issues tree at /issues under nginx's docroot.
# $DOCROOT/issues is an empty placeholder from the builder stage. We
# must `rm -rf` it first because `ln -sfn` on a non-empty directory
# silently fails to replace it and just drops a useless symlink inside.
# (Covers are already baked into $DOCROOT/covers at build time and
# don't need a runtime symlink.)
rm -rf "$DOCROOT/issues"
ln -sfn "$ISSUES_DIR" "$DOCROOT/issues"

echo "[entrypoint] Symlinks ready; nginx will serve $DOCROOT"
echo "[entrypoint] (Handing off to nginx:alpine's own /docker-entrypoint.sh)"
